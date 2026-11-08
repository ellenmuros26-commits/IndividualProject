import { Op } from "sequelize";
import { PayrollPeriod } from "../../models/associations.js";

const statuses = ["Open", "Processing", "Approved", "Closed"];

const validDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const validatePeriod = (body) => {
  const periodName = typeof body.period_name === "string" ? body.period_name.trim() : "";
  const startDate = body.start_date;
  const endDate = body.end_date;
  const paymentDate = body.payment_date || null;

  if (!periodName) {
    return { error: "Period name is required." };
  }

  if (!validDate(startDate) || !validDate(endDate)) {
    return { error: "Enter valid start and end dates." };
  }

  if (endDate < startDate) {
    return { error: "End date cannot be before start date." };
  }

  if (paymentDate && !validDate(paymentDate)) {
    return { error: "Enter a valid payment date." };
  }

  return {
    values: {
      period_name: periodName,
      start_date: startDate,
      end_date: endDate,
      payment_date: paymentDate
    }
  };
};

const renderPeriodForm = (res, options) => {
  return res.status(options.status || 200).render("payroll-finance/period-form", {
    title: options.title,
    period: options.period || null,
    values: options.values,
    error: options.error
  });
};

const findOverlap = (values, excludedId) => {
  const where = {
    start_date: { [Op.lte]: values.end_date },
    end_date: { [Op.gte]: values.start_date }
  };

  if (excludedId) {
    where.id = { [Op.ne]: excludedId };
  }

  return PayrollPeriod.findOne({ where });
};

export const listPayrollPeriods = async (req, res) => {
  try {
    const records = await PayrollPeriod.findAll({
      order: [["start_date", "DESC"], ["id", "DESC"]]
    });
    const periods = records.map(period => ({
      ...period.get({ plain: true }),
      is_open: period.period_status === "Open",
      can_generate: ["Open", "Processing"].includes(period.period_status),
      next_status: statuses[statuses.indexOf(period.period_status) + 1] || ""
    }));

    return res.render("payroll-finance/periods", {
      title: "Payroll Periods",
      periods,
      success: req.query.success,
      error: req.query.error,
      statuses
    });
  } catch (error) {
    console.error("List payroll periods error:", error);
    return res.status(500).render("payroll-finance/periods", {
      title: "Payroll Periods",
      periods: [],
      statuses,
      error: "Failed to load payroll periods."
    });
  }
};

export const newPayrollPeriod = (req, res) => {
  return renderPeriodForm(res, {
    title: "Add Payroll Period",
    values: { period_name: "", start_date: "", end_date: "", payment_date: "" }
  });
};

export const createPayrollPeriod = async (req, res) => {
  const result = validatePeriod(req.body || {});
  if (result.error) {
    return renderPeriodForm(res, {
      title: "Add Payroll Period",
      values: req.body || {},
      error: result.error,
      status: 400
    });
  }

  try {
    const overlap = await findOverlap(result.values);
    if (overlap) {
      return renderPeriodForm(res, {
        title: "Add Payroll Period",
        values: result.values,
        error: "This date range overlaps an existing payroll period.",
        status: 400
      });
    }

    await PayrollPeriod.create({
      ...result.values,
      period_status: "Open",
      created_by: req.session.userId
    });

    return res.redirect("/payroll-finance/periods?success=Payroll%20period%20created.");
  } catch (error) {
    console.error("Create payroll period error:", error);
    return renderPeriodForm(res, {
      title: "Add Payroll Period",
      values: result.values,
      error: "Failed to create payroll period.",
      status: 500
    });
  }
};

export const editPayrollPeriod = async (req, res) => {
  try {
    const period = await PayrollPeriod.findByPk(req.params.id);
    if (!period) {
      return res.status(404).send("Payroll period not found.");
    }

    if (period.period_status !== "Open") {
      return res.redirect("/payroll-finance/periods?error=Only%20open%20periods%20can%20be%20edited.");
    }

    return renderPeriodForm(res, {
      title: "Edit Payroll Period",
      period,
      values: period.get({ plain: true })
    });
  } catch (error) {
    console.error("Load payroll period error:", error);
    return res.status(500).send("Failed to load payroll period.");
  }
};

export const updatePayrollPeriod = async (req, res) => {
  const result = validatePeriod(req.body || {});
  try {
    const period = await PayrollPeriod.findByPk(req.params.id);
    if (!period) {
      return res.status(404).send("Payroll period not found.");
    }

    if (period.period_status !== "Open") {
      return res.redirect("/payroll-finance/periods?error=Only%20open%20periods%20can%20be%20edited.");
    }

    if (result.error) {
      return renderPeriodForm(res, {
        title: "Edit Payroll Period",
        period,
        values: req.body || {},
        error: result.error,
        status: 400
      });
    }

    const overlap = await findOverlap(result.values, period.id);
    if (overlap) {
      return renderPeriodForm(res, {
        title: "Edit Payroll Period",
        period,
        values: result.values,
        error: "This date range overlaps an existing payroll period.",
        status: 400
      });
    }

    await period.update(result.values);
    return res.redirect("/payroll-finance/periods?success=Payroll%20period%20updated.");
  } catch (error) {
    console.error("Update payroll period error:", error);
    return res.status(500).send("Failed to update payroll period.");
  }
};

export const deletePayrollPeriod = async (req, res) => {
  try {
    const period = await PayrollPeriod.findByPk(req.params.id);
    if (!period) {
      return res.status(404).send("Payroll period not found.");
    }

    if (period.period_status !== "Open") {
      return res.redirect("/payroll-finance/periods?error=Only%20open%20periods%20can%20be%20deleted.");
    }

    await period.destroy();
    return res.redirect("/payroll-finance/periods?success=Payroll%20period%20deleted.");
  } catch (error) {
    console.error("Delete payroll period error:", error);
    return res.status(500).send("Failed to delete payroll period.");
  }
};

export const changePayrollPeriodStatus = async (req, res) => {
  try {
    const period = await PayrollPeriod.findByPk(req.params.id);
    if (!period) {
      return res.status(404).send("Payroll period not found.");
    }

    const currentIndex = statuses.indexOf(period.period_status);
    const nextStatus = statuses[currentIndex + 1];
    if (!nextStatus || req.body.status !== nextStatus) {
      return res.redirect("/payroll-finance/periods?error=Payroll%20period%20status%20must%20advance%20in%20order.");
    }

    await period.update({ period_status: nextStatus });
    return res.redirect("/payroll-finance/periods?success=Payroll%20period%20status%20updated.");
  } catch (error) {
    console.error("Change payroll period status error:", error);
    return res.status(500).send("Failed to change payroll period status.");
  }
};
