const jwt = require('jsonwebtoken');
const JWT_SECRET =  "screate";

const fetchuser = (req, res, next) => {
    // Get token from header
    const token = req.header("Authorization");
    
    if (!token) {
        return res.status(401).json({ error: "Access Denied. No token provided." });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded.User; // Attach user ID to request
        next();
    } catch (error) {
        res.status(401).json({ error: "Invalid Token" });
    }
};

module.exports = fetchuser;
