const express = require('express');
const router = express.Router();

// Import route modules
const configRoutes = require('./routes/config-routes');
const fileRoutes = require('./routes/file-routes');
const workflowRoutes = require('./routes/workflow-routes');
const bentomlRoutes = require('./routes/bentoml-routes');
const directoryRoutes = require('./routes/directory-management-routes');

// Use the imported routes
router.use(configRoutes);
router.use(fileRoutes.router);
router.use(workflowRoutes);
router.use(bentomlRoutes);
router.use(directoryRoutes);

// Export router and actionHistory from file routes
module.exports = { router, actionHistory: fileRoutes.actionHistory };
