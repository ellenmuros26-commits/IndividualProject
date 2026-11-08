import { Op } from "sequelize";
import { sequelize } from "../../models/db.js";
import {
  Attendance,
  PayrollItem,
  PayrollPeriod,
  PayrollRecord,
  Worker,
  WorkerPayRate
} from "../../models/associations.js";

const attendanceStatuses = ["Present", "Late", "Half Day"];
const itemTypes = ["Earning", "Deduction"];

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const parsePositiveId = (value) => {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseMoney = (value, { allowZero = true } = {}) => {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  if (typeof value === "string" && !value.trim()) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || (!allowZero && parsed === 0)) {
    return null;
  }

  const rounded = roundMoney(parsed);
  if ((!allowZero && rounded === 0) || rounded > 9999999999.99) {
    return null;
  }

  return rounded;
};

const withQueryMessage = (path, key, value) => {
  const params = new URLSearchParams({ [key]: value });
  return `${path}?${params.toString()}`;
};

const getPayrollDetail = (id, transaction) => {
  return PayrollRecord.findByPk(id, {
    include: [
      { model: Worker, as: "worker" },
      { model: PayrollPeriod, as: "payrollPeriod" },
      { model: WorkerPayRate, as: "payRate" },
      { model: PayrollItem, as: "items" }
    ],
    order: [[{ model: PayrollItem, as: "items" }, "id", "ASC"]],
    transaction
  });
};

const updateRecordTotals = async (record, transaction) => {
  const items = await PayrollItem.findAll({
    where: { payroll_record_id: record.id },
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  const basicPay = roundMoney(items
    .filter(item => item.item_type === "Earning" && item.item_name === "Basic Pay")
    .reduce((sum, item) => sum + Number(item.amount), 0));
  const overtimePay = roundMoney(items
    .filter(item => item.item_type === "Earning" && item.item_name === "Overtime Pay")
    .reduce((sum, item) => sum + Number(item.amount), 0));
  const totalDeductions = roundMoney(items
    .filter(item => item.item_type === "Deduction")
    .reduce((sum, item) => sum + Number(item.amount), 0));
  const earnings = roundMoney(items
    .filter(item => item.item_type === "Earning")
    .reduce((sum, item) => sum + Number(item.amount), 0));
  const grossPay = roundMoney(earnings + Number(record.allowances || 0));

  await record.update({
    basic_pay: basicPay,
    overtime_pay: overtimePay,
    total_deductions: totalDeductions,
    gross_pay: grossPay,
    net_pay: roundMoney(grossPay - totalDeductions)
  }, { transaction });
};

const findDraftRecord = async (id, transaction) => {
  return PayrollRecord.findByPk(id, {
    transaction,
    lock: transaction.LOCK.UPDATE
  });
};

const validateItem = (body) => {
  const itemType = body.item_type;
  const itemName = typeof body.item_name === "string" ? body.item_name.trim() : "";
  const amount = parseMoney(body.amount, { allowZero: false });
  const description = typeof body.description === "string" ? body.description.trim() : "";

  if (!itemTypes.includes(itemType)) {
    return { error: "Select a valid item type." };
  }

  if (!itemName || itemName.length > 255) {
    return { error: "Enter an item name with no more than 255 characters." };
  }

  if (amount === null) {
    return { error: "Enter an amount greater than zero." };
  }

  if (description.length > 5000) {
    return { error: "Description must be no more than 5000 characters." };
  }

  return {
    values: {
      item_type: itemType,
      item_name: itemName,
      amount,
      description: description || null
    }
  };
};

export const generatePayroll = async (req, res) => {
  const periodId = parsePositiveId(req.params.id);
  if (!periodId) {
    return res.status(400).send("Invalid payroll period.");
  }

  let transaction;
  try {
    transaction = await sequelize.transaction();
    const period = await PayrollPeriod.findByPk(periodId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!period) {
      await transaction.rollback();
      return res.status(404).send("Payroll period not found.");
    }

    if (!["Open", "Processing"].includes(period.period_status)) {
      await transaction.rollback();
      return res.redirect(withQueryMessage("/payroll-finance/periods", "error", "Payroll generation is allowed only for Open or Processing periods."));
    }

    const workers = await Worker.findAll({
      where: { employment_status: "Active" },
      order: [["id", "ASC"]],
      transaction
    });
    const workerIds = workers.map(worker => worker.id);
    if (workerIds.length === 0) {
      await transaction.commit();
      const params = new URLSearchParams({
        period_id: String(period.id),
        success: "No active workers were found."
      });
      return res.redirect(`/payroll-finance/payroll?${params.toString()}`);
    }

    const [attendance, rates, records] = await Promise.all([
      Attendance.findAll({
        where: {
          worker_id: { [Op.in]: workerIds },
          attendance_date: { [Op.between]: [period.start_date, period.end_date] },
          verification_status: "Verified",
          attendance_status: { [Op.in]: attendanceStatuses }
        },
        order: [["attendance_date", "ASC"]],
        transaction
      }),
      WorkerPayRate.findAll({
        where: {
          worker_id: { [Op.in]: workerIds },
          effective_date: { [Op.lte]: period.end_date },
          [Op.or]: [
            { end_date: { [Op.is]: null } },
            { end_date: { [Op.gte]: period.start_date } }
          ]
        },
        order: [["effective_date", "DESC"], ["id", "DESC"]],
        transaction
      }),
      PayrollRecord.findAll({
        where: { payroll_period_id: period.id },
        transaction,
        lock: transaction.LOCK.UPDATE
      })
    ]);

    const workerById = new Map(workers.map(worker => [String(worker.id), worker]));
    const attendanceByWorker = new Map();
    for (const entry of attendance) {
      const key = String(entry.worker_id);
      if (!attendanceByWorker.has(key)) {
        attendanceByWorker.set(key, []);
      }
      attendanceByWorker.get(key).push(entry);
    }

    const rateByWorker = new Map();
    for (const rate of rates) {
      const key = String(rate.worker_id);
      if (!rateByWorker.has(key)) {
        rateByWorker.set(key, rate);
      }
    }

    const recordByWorker = new Map(records.map(record => [String(record.worker_id), record]));
    const skipped = [];
    let generated = 0;
    let unchanged = 0;

    for (const [workerId, entries] of attendanceByWorker) {
      const worker = workerById.get(workerId);
      if (!worker) {
        continue;
      }

      const existing = recordByWorker.get(workerId);
      if (existing && existing.payroll_status !== "Draft") {
        unchanged += 1;
        continue;
      }

      const rate = rateByWorker.get(workerId);
      if (!rate) {
        skipped.push(`${worker.first_name} ${worker.last_name} (${worker.worker_code})`);
        continue;
      }

      const days = new Map();
      let totalHours = 0;
      for (const entry of entries) {
        const hours = Number(entry.total_work_hours);
        if (!Number.isFinite(hours) || hours < 0) {
          throw new Error(`Invalid attendance hours for worker ${worker.worker_code}.`);
        }

        totalHours += hours;
        const day = days.get(entry.attendance_date) || { hours: 0, statuses: new Set() };
        day.hours += hours;
        day.statuses.add(entry.attendance_status);
        days.set(entry.attendance_date, day);
      }

      let regularHours = 0;
      let overtimeHours = 0;
      let totalWorkDays = 0;
      for (const day of days.values()) {
        regularHours += Math.min(day.hours, 8);
        overtimeHours += Math.max(day.hours - 8, 0);
        if (day.statuses.has("Present") || day.statuses.has("Late")) {
          totalWorkDays += 1;
        } else if (day.statuses.has("Half Day")) {
          totalWorkDays += 0.5;
        }
      }

      const payRate = Number(rate.pay_rate);
      if (!Number.isFinite(payRate) || payRate <= 0) {
        throw new Error(`Invalid pay rate for worker ${worker.worker_code}.`);
      }

      const hourlyEquivalent = rate.pay_type === "Hourly"
        ? payRate
        : rate.pay_type === "Daily"
          ? payRate / 8
          : payRate / 26 / 8;

      const basicPay = roundMoney(
        rate.pay_type === "Hourly"
          ? regularHours * payRate
          : rate.pay_type === "Daily"
            ? totalWorkDays * payRate
            : payRate / 2
      );
      const overtimePay = roundMoney(overtimeHours * hourlyEquivalent * 1.25);
      const recordValues = {
        payroll_period_id: period.id,
        worker_id: worker.id,
        pay_rate_id: rate.id,
        total_work_hours: Number(totalHours.toFixed(2)),
        total_work_days: Number(totalWorkDays.toFixed(2)),
        basic_pay: basicPay,
        overtime_pay: overtimePay,
        allowances: existing ? Number(existing.allowances || 0) : 0,
        total_deductions: 0,
        gross_pay: 0,
        net_pay: 0,
        payroll_status: "Draft"
      };

      let record = existing;
      if (record) {
        await record.update(recordValues, { transaction });
        await PayrollItem.destroy({
          where: {
            payroll_record_id: record.id,
            item_type: "Earning",
            item_name: { [Op.in]: ["Basic Pay", "Overtime Pay"] }
          },
          transaction
        });
      } else {
        record = await PayrollRecord.create(recordValues, { transaction });
        recordByWorker.set(workerId, record);
      }

      const generatedItems = [];
      if (basicPay > 0) {
        generatedItems.push({
          payroll_record_id: record.id,
          item_type: "Earning",
          item_name: "Basic Pay",
          amount: basicPay,
          description: "Generated from verified attendance and the worker's pay rate."
        });
      }
      if (overtimePay > 0) {
        generatedItems.push({
          payroll_record_id: record.id,
          item_type: "Earning",
          item_name: "Overtime Pay",
          amount: overtimePay,
          description: "Verified hours above eight per attendance day, at 1.25x."
        });
      }
      if (generatedItems.length > 0) {
        await PayrollItem.bulkCreate(generatedItems, { transaction });
      }

      await updateRecordTotals(record, transaction);
      generated += 1;
    }

    await transaction.commit();

    const params = new URLSearchParams({
      period_id: String(period.id),
      success: `${generated} payroll record(s) generated or recalculated.${unchanged ? ` ${unchanged} non-Draft record(s) were left unchanged.` : ""}`
    });
    if (skipped.length > 0) {
      params.set("skipped", skipped.join(", "));
    }
    return res.redirect(`/payroll-finance/payroll?${params.toString()}`);
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Generate payroll error:", error);
    return res.redirect(withQueryMessage(
      `/payroll-finance/periods`,
      "error",
      "Failed to generate payroll."
    ));
  }
};

export const listPayrollRecords = async (req, res) => {
  try {
    const periods = await PayrollPeriod.findAll({
      order: [["start_date", "DESC"], ["id", "DESC"]]
    });
    const selectedPeriodId = req.query.period_id ? String(req.query.period_id) : "";
    let records = [];
    let error = req.query.error;

    if (selectedPeriodId) {
      const periodId = parsePositiveId(selectedPeriodId);
      if (!periodId) {
        error = "Select a valid payroll period.";
      } else {
        records = await PayrollRecord.findAll({
          where: { payroll_period_id: periodId },
          include: [{ model: Worker, as: "worker" }],
          order: [[{ model: Worker, as: "worker" }, "last_name", "ASC"], ["id", "ASC"]]
        });
        if (!periods.some(period => String(period.id) === String(periodId))) {
          error = "Payroll period not found.";
          records = [];
        }
      }
    }

    const periodOptions = periods.map(period => ({
      ...period.get({ plain: true }),
      selected: String(period.id) === selectedPeriodId
    }));

    return res.render("payroll-finance/payroll", {
      title: "Payroll Records",
      periods: periodOptions,
      records,
      selectedPeriodId,
      success: req.query.success,
      skipped: req.query.skipped,
      error
    });
  } catch (error) {
    console.error("List payroll records error:", error);
    return res.status(500).render("payroll-finance/payroll", {
      title: "Payroll Records",
      periods: [],
      records: [],
      error: "Failed to load payroll records."
    });
  }
};

export const getPayrollRecord = async (req, res) => {
  try {
    const recordId = parsePositiveId(req.params.id);
    if (!recordId) {
      return res.status(400).send("Invalid payroll record.");
    }

    const record = await getPayrollDetail(recordId);
    if (!record) {
      return res.status(404).send("Payroll record not found.");
    }

    const payrollRecord = record.get({ plain: true });
    payrollRecord.items = payrollRecord.items
      .sort((left, right) => left.id - right.id)
      .map(item => ({
        ...item,
        typeOptions: itemTypes.map(itemType => ({
          name: itemType,
          selected: item.item_type === itemType
        }))
      }));
    return res.render("payroll-finance/payroll-detail", {
      title: `Payroll Record - ${payrollRecord.worker.worker_code}`,
      record: payrollRecord,
      isDraft: payrollRecord.payroll_status === "Draft",
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error("Get payroll record error:", error);
    return res.status(500).send("Failed to load payroll record.");
  }
};

export const updatePayrollRecord = async (req, res) => {
  const recordId = parsePositiveId(req.params.id);
  const allowances = parseMoney(req.body?.allowances);
  const remarks = typeof req.body?.remarks === "string" ? req.body.remarks : "";

  if (!recordId) {
    return res.status(400).send("Invalid payroll record.");
  }
  if (allowances === null) {
    return res.redirect(withQueryMessage(`/payroll-finance/payroll/${recordId}`, "error", "Allowances must be a non-negative amount."));
  }
  if (remarks.length > 5000) {
    return res.redirect(withQueryMessage(`/payroll-finance/payroll/${recordId}`, "error", "Remarks must be no more than 5000 characters."));
  }

  let transaction;
  try {
    transaction = await sequelize.transaction();
    const record = await findDraftRecord(recordId, transaction);
    if (!record) {
      await transaction.rollback();
      return res.status(404).send("Payroll record not found.");
    }
    if (record.payroll_status !== "Draft") {
      await transaction.rollback();
      return res.redirect(withQueryMessage(`/payroll-finance/payroll/${recordId}`, "error", "Only Draft payroll records can be edited."));
    }

    await record.update({ allowances, remarks: remarks.trim() || null }, { transaction });
    await updateRecordTotals(record, transaction);
    await transaction.commit();
    return res.redirect(withQueryMessage(`/payroll-finance/payroll/${recordId}`, "success", "Payroll record updated."));
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Update payroll record error:", error);
    return res.redirect(withQueryMessage(`/payroll-finance/payroll/${recordId}`, "error", "Failed to update payroll record."));
  }
};

export const createPayrollItem = async (req, res) => {
  const recordId = parsePositiveId(req.params.id);
  const result = validateItem(req.body || {});
  if (!recordId) {
    return res.status(400).send("Invalid payroll record.");
  }
  if (result.error) {
    return res.redirect(withQueryMessage(`/payroll-finance/payroll/${recordId}`, "error", result.error));
  }

  let transaction;
  try {
    transaction = await sequelize.transaction();
    const record = await findDraftRecord(recordId, transaction);
    if (!record) {
      await transaction.rollback();
      return res.status(404).send("Payroll record not found.");
    }
    if (record.payroll_status !== "Draft") {
      await transaction.rollback();
      return res.redirect(withQueryMessage(`/payroll-finance/payroll/${recordId}`, "error", "Only Draft payroll records can be edited."));
    }

    await PayrollItem.create({
      payroll_record_id: record.id,
      ...result.values
    }, { transaction });
    await updateRecordTotals(record, transaction);
    await transaction.commit();
    return res.redirect(withQueryMessage(`/payroll-finance/payroll/${recordId}`, "success", "Payroll item added."));
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Create payroll item error:", error);
    return res.redirect(withQueryMessage(`/payroll-finance/payroll/${recordId}`, "error", "Failed to add payroll item."));
  }
};

export const updatePayrollItem = async (req, res) => {
  const recordId = parsePositiveId(req.params.id);
  const itemId = parsePositiveId(req.params.itemId);
  const result = validateItem(req.body || {});
  if (!recordId || !itemId) {
    return res.status(400).send("Invalid payroll item.");
  }
  if (result.error) {
    return res.redirect(withQueryMessage(`/payroll-finance/payroll/${recordId}`, "error", result.error));
  }

  let transaction;
  try {
    transaction = await sequelize.transaction();
    const record = await findDraftRecord(recordId, transaction);
    if (!record) {
      await transaction.rollback();
      return res.status(404).send("Payroll record not found.");
    }
    if (record.payroll_status !== "Draft") {
      await transaction.rollback();
      return res.redirect(withQueryMessage(`/payroll-finance/payroll/${recordId}`, "error", "Only Draft payroll records can be edited."));
    }

    const item = await PayrollItem.findOne({
      where: { id: itemId, payroll_record_id: record.id },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!item) {
      await transaction.rollback();
      return res.status(404).send("Payroll item not found.");
    }

    await item.update(result.values, { transaction });
    await updateRecordTotals(record, transaction);
    await transaction.commit();
    return res.redirect(withQueryMessage(`/payroll-finance/payroll/${recordId}`, "success", "Payroll item updated."));
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Update payroll item error:", error);
    return res.redirect(withQueryMessage(`/payroll-finance/payroll/${recordId}`, "error", "Failed to update payroll item."));
  }
};

export const deletePayrollItem = async (req, res) => {
  const recordId = parsePositiveId(req.params.id);
  const itemId = parsePositiveId(req.params.itemId);
  if (!recordId || !itemId) {
    return res.status(400).send("Invalid payroll item.");
  }

  let transaction;
  try {
    transaction = await sequelize.transaction();
    const record = await findDraftRecord(recordId, transaction);
    if (!record) {
      await transaction.rollback();
      return res.status(404).send("Payroll record not found.");
    }
    if (record.payroll_status !== "Draft") {
      await transaction.rollback();
      return res.redirect(withQueryMessage(`/payroll-finance/payroll/${recordId}`, "error", "Only Draft payroll records can be edited."));
    }

    const item = await PayrollItem.findOne({
      where: { id: itemId, payroll_record_id: record.id },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!item) {
      await transaction.rollback();
      return res.status(404).send("Payroll item not found.");
    }

    await item.destroy({ transaction });
    await updateRecordTotals(record, transaction);
    await transaction.commit();
    return res.redirect(withQueryMessage(`/payroll-finance/payroll/${recordId}`, "success", "Payroll item deleted."));
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Delete payroll item error:", error);
    return res.redirect(withQueryMessage(`/payroll-finance/payroll/${recordId}`, "error", "Failed to delete payroll item."));
  }
};
