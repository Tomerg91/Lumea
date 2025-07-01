export const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: 'Unauthorized. Please log in.' });
};
export const isCoach = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Unauthorized. Please log in.' });
    }
    if (req.user && req.user.role === 'coach') {
        return next();
    }
    res.status(403).json({ message: 'Forbidden. Coach access required.' });
};
