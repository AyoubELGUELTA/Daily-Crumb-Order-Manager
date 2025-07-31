const checkAdminEmployeeRole = (req, res, next) => {
    if (!['Admin', 'Employee'].includes(req.user.userRole)) {
        return res.status(403).json({ message: 'Only admins/employees can perform this action.' });
    }
    next();
};

module.exports = checkAdminEmployeeRole;