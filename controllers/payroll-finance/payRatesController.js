import { Op } from "sequelize";
import { sequelize } from "../../models/db.js";
import { Worker, WorkerPayRate } from "../../models/associations.js";

const payTypes = ["Hourly", "Daily", "Monthly"];

const validDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const getWorkers = async (selectedWorkerId) => {
  const workers = await Worker.findAll({
    attributes: ["id", "worker_code", "first_name", "middle_name", "last_name"],
    order: [["last_name", "ASC"], ["first_name", "ASC"]]
  });

  return workers.map(worker => ({
    ...worker.get({ plain: true }),
    selected: String(worker.id) === String(selectedWorkerId)
  }));
};

const renderRateForm = async (res, options) => {
  const workers = await getWorkers(options.values.worker_id);
  return res.status(options.status || 200).render("payroll-finance/pay-rate-form", {
    title: options.title,
    workers,
    payTypes: payTypes.map(payType => ({
      name: payType,
      selected: options.values.pay_type === payType
    })),
    rate: options.rate || null,
    values: options.values,
    error: options.error
  });
};

const validateRate = (body) => {
  const workerId = Number(body.worker_id);
  const payRate = Number(body.pay_rate);
  const effectiveDate = body.effective_date;
  const endDate = body.end_date || null;

  if (!Number.isInteger(workerId) || workerId < 1) {
    return { error: "Select a valid worker." };
  }

  if (!payTypes.includes(body.pay_type)) {
    return { error: "Select a valid pay type." };
  }

  if (!Number.isFinite(payRate) || payRate <= 0) {
    return { error: "Pay rate must be a positive number." };
  }

  if (!validDate(effectiveDate)) {
    return { error: "Enter a valid effective date." };
  }

  if (endDate && (!validDate(endDate) || endDate < effectiveDate)) {
    return { error: "End date must be a valid date on or after the effective date." };
  }

  return {
    values: {
      worker_id: workerId,
      pay_type: body.pay_type,
      pay_rate: body.pay_rate,
      effective_date: effectiveDate,
      end_date: endDate
    }
  };
};

const dateBefore = (value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
};

const rateIncludes = [{
  model: Worker,
  as: "worker",
  attributes: ["id", "worker_code", "first_name", "middle_name", "last_name"]
}];

export const listPayRates = async (req, res) => {
  try {
    const filterWorkerId = req.query.worker_id || "";
    const where = {};

    if (filterWorkerId) {
      if (!/^\d+$/.test(String(filterWorkerId)) || Number(filterWorkerId) < 1) {
        const workers = await getWorkers("");
        return res.status(400).render("payroll-finance/pay-rates", {
          title: "Pay Rates",
          rates: [],
          workers,
          selectedWorkerId: filterWorkerId,
          error: "Select a valid worker."
        });
      }

      where.worker_id = Number(filterWorkerId);
    }

    const [rates, workers] = await Promise.all([
      WorkerPayRate.findAll({
        where,
        include: rateIncludes,
        order: [["effective_date", "DESC"], ["id", "DESC"]]
      }),
      getWorkers(filterWorkerId)
    ]);

    return res.render("payroll-finance/pay-rates", {
      title: "Pay Rates",
      rates,
      workers,
      selectedWorkerId: filterWorkerId,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error("List pay rates error:", error);
    return res.status(500).render("payroll-finance/pay-rates", {
      title: "Pay Rates",
      rates: [],
      workers: [],
      error: "Failed to load pay rates."
    });
  }
};

export const newPayRate = async (req, res) => {
  try {
    return await renderRateForm(res, {
      title: "Add Pay Rate",
      values: { worker_id: "", pay_type: "", pay_rate: "", effective_date: "", end_date: "" }
    });
  } catch (error) {
    console.error("Load pay rate form error:", error);
    return res.status(500).send("Failed to load pay rate form.");
  }
};

export const createPayRate = async (req, res) => {
  const result = validateRate(req.body || {});
  if (result.error) {
    return renderRateForm(res, {
      title: "Add Pay Rate",
      values: req.body || {},
      error: result.error,
      status: 400
    }).catch(error => {
      console.error("Load pay rate form error:", error);
      return res.status(500).send("Failed to load pay rate form.");
    });
  }

  try {
    const transaction = await sequelize.transaction();
    try {
      const worker = await Worker.findByPk(result.values.worker_id, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!worker) {
        await transaction.rollback();
        return renderRateForm(res, {
          title: "Add Pay Rate",
          values: result.values,
          error: "The selected worker was not found.",
          status: 400
        });
      }

      const currentRate = await WorkerPayRate.findOne({
        where: {
          worker_id: result.values.worker_id,
          end_date: { [Op.is]: null }
        },
        order: [["effective_date", "DESC"], ["id", "DESC"]],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (currentRate && currentRate.effective_date >= result.values.effective_date) {
        await transaction.rollback();
        return renderRateForm(res, {
          title: "Add Pay Rate",
          values: result.values,
          error: "The effective date must be after the worker's current open rate.",
          status: 400
        });
      }

      if (currentRate) {
        await currentRate.update({
          end_date: dateBefore(result.values.effective_date)
        }, { transaction });
      }

      await WorkerPayRate.create({
        ...result.values,
        created_by: req.session.userId
      }, { transaction });

      await transaction.commit();
      return res.redirect("/payroll-finance/pay-rates?success=Pay%20rate%20created.");
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Create pay rate error:", error);
    return renderRateForm(res, {
      title: "Add Pay Rate",
      values: result.values,
      error: "Failed to create pay rate.",
      status: 500
    });
  }
};

export const editPayRate = async (req, res) => {
  try {
    const rate = await WorkerPayRate.findByPk(req.params.id, { include: rateIncludes });
    if (!rate) {
      return res.status(404).send("Pay rate not found.");
    }

    return await renderRateForm(res, {
      title: "Edit Pay Rate",
      rate,
      values: rate.get({ plain: true })
    });
  } catch (error) {
    console.error("Load pay rate error:", error);
    return res.status(500).send("Failed to load pay rate.");
  }
};

export const updatePayRate = async (req, res) => {
  const result = validateRate(req.body || {});
  if (result.error) {
    try {
      const rate = await WorkerPayRate.findByPk(req.params.id);
      if (!rate) {
        return res.status(404).send("Pay rate not found.");
      }

      return await renderRateForm(res, {
        title: "Edit Pay Rate",
        rate,
        values: req.body || {},
        error: result.error,
        status: 400
      });
    } catch (error) {
      console.error("Load pay rate form error:", error);
      return res.status(500).send("Failed to load pay rate form.");
    }
  }

  try {
    const [rate, worker] = await Promise.all([
      WorkerPayRate.findByPk(req.params.id),
      Worker.findByPk(result.values.worker_id)
    ]);

    if (!rate) {
      return res.status(404).send("Pay rate not found.");
    }

    if (!worker) {
      return renderRateForm(res, {
        title: "Edit Pay Rate",
        rate,
        values: result.values,
        error: "The selected worker was not found.",
        status: 400
      });
    }

    await rate.update(result.values);
    return res.redirect("/payroll-finance/pay-rates?success=Pay%20rate%20updated.");
  } catch (error) {
    console.error("Update pay rate error:", error);
    return res.status(500).send("Failed to update pay rate.");
  }
};

export const deletePayRate = async (req, res) => {
  try {
    const rate = await WorkerPayRate.findByPk(req.params.id);
    if (!rate) {
      return res.status(404).send("Pay rate not found.");
    }

    await rate.destroy();
    return res.redirect("/payroll-finance/pay-rates?success=Pay%20rate%20deleted.");
  } catch (error) {
    console.error("Delete pay rate error:", error);
    return res.status(500).send("Failed to delete pay rate.");
  }
};
