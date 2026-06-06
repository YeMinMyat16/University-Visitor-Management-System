const Visitor = require('../models/visitor');
const Visit = require('../models/visit');

exports.getCheckins = async (req, res) => {
  try {
    const visits = await Visit.findAllPending();
    res.json(visits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createCheckin = async (req, res) => {
  try {
    const { full_name, id_number, contact_number, vehicle_plate, image_base64, person_to_meet, reason } = req.body;
    
    let visitor = await Visitor.findByIdNumber(id_number);
    let visitor_id;

    if (!visitor) {
      visitor_id = await Visitor.create({ full_name, id_number, contact_number, vehicle_plate, image_base64 });
    } else {
      visitor_id = visitor.id;
      // Always update existing visitor with the latest info (new selfie, new vehicle info, etc.)
      await Visitor.update(visitor_id, { full_name, contact_number, vehicle_plate, image_base64 });
    }

    const visitId = await Visit.create({ visitor_id, person_to_meet, reason });
    res.status(201).json({ id: visitId, visitor_id, status: 'pending' });
  } catch (error) {
    console.error("Check-in Error Details:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.approveCheckin = async (req, res) => {
  try {
    await Visit.updateStatus(req.params.id, 'inside', 'checkin_time');
    res.json({ message: 'Visitor checked in' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.rejectCheckin = async (req, res) => {
  try {
    const { reason } = req.body;
    await Visit.updateStatus(req.params.id, 'rejected', null, reason);
    res.json({ message: 'Check-in rejected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getActiveVisitors = async (req, res) => {
  try {
    const active = await Visit.findAllActive();
    res.json(active);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.checkoutVisitor = async (req, res) => {
  try {
    await Visit.updateStatus(req.params.id, 'completed', 'checkout_time');
    res.json({ message: 'Visitor checked out' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const history = await Visit.findHistory();
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.resetSystem = async (req, res) => {
  try {
    await Visit.deleteAll();
    res.json({ message: 'System reset successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getVisitStatus = async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id);
    if (!visit) return res.status(404).json({ message: 'Visit not found' });
    res.json({ status: visit.status, checkin_time: visit.checkin_time, rejection_reason: visit.rejection_reason });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCheckoutRequests = async (req, res) => {
  try {
    const visits = await Visit.findAllCheckoutRequests();
    res.json(visits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.requestCheckout = async (req, res) => {
  try {
    await Visit.updateStatus(req.params.id, 'request_checkout');
    res.json({ message: 'Checkout requested' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.searchVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.findByIdNumber(req.params.idNumber);
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
    res.json(visitor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
