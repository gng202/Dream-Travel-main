const express = require('express');
const router = express.Router();
const locations = require('../data/locations');

router.get('/', (req, res) => {
    res.json({ data: locations });
});

router.get('/:id', (req, res) => {
    const location = locations.find(item => item.id === req.params.id);
    if (!location) {
        return res.status(404).json({ error: 'Location not found.' });
    }
    res.json({ data: location });
});

module.exports = router;
