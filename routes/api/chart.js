const express = require('express');
const router = express.Router();

const uuid = require('uuid');

const Chart = require('../../models/Chart');

// @route GET api/charts
// @desc Create a chart
// @access - public - No auth checks in place yet

// Create a chart
router.post('/api/chart', async (req, res) => {
	const { chartName, chartType, createdBy } = req.body;

	try {
		// Create instance of chart
		const chart = await new Chart({
			chartName: chartName,
			chartType: chartType,
			createdBy: createdBy,
			chartId: `${createdBy}-${uuid.v4()}`,
		});

		const savedChart = await chart.save();

		res.status(200).json({ data: savedChart });
	} catch (err) {
		console.log('err', err.message);
		res.status(500).send('Server Error');
	}
});

module.exports = router;
