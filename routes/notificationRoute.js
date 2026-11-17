const express = require('express');
const router = express.Router();
const { addClient } = require('../utils/sseManager');
const { authenticate } = require('../middleware/authMiddleware');
const { getAccess } = require('../services/ability.service'); // add this import

router.get('/notifications', async (req, res) => {
  try {
    if (req.query.token) {
      await new Promise((resolve, reject) => {
        authenticate(req, res, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      // NEW: gate admin/staff access behind notification.view
      if (["admin", "staff"].includes(req.user.role)) {
        const { entitled, allowed } = await getAccess(req.user);
        if (!entitled.has("notification.view")) {
          return res.status(403).json({ code: "FEATURE_NOT_IN_PLAN", message: "This feature is not part of your plan." });
        }
        if (!allowed.has("notification.view")) {
          return res.status(403).json({ code: "PERMISSION_DENIED", message: "You do not have permission for this action." });
        }
      }
    } else if (req.query.fingerPrint) {
      req.user = { role: "guest" };
    } else {
      return res.status(400).json({
        message: "Provide token (admin) or fingerPrint (user)"
      });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.flushHeaders();
    res.write('\n');

    req.on('close', () => {
    });

    addClient(req, res);

  } catch (err) {
    return res.status(401).end();
  }
});

module.exports = router;