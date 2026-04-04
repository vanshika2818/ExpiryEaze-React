const mongoose = require("mongoose");

const MedicineVerificationSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  businessName: { type: String, required: true },
  businessType: { type: String, required: true },
  licenseNumber: { type: String, required: true },
  pharmacyLicense: { type: String, required: true },
  businessAddress: { type: String, required: true },
  contactPerson: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: { type: String, required: true },
  yearsInBusiness: { type: Number, required: true },
  certifications: { type: String, required: true },
  storageFacility: { type: String, required: true },
  temperatureControl: { type: String, required: true },
  securityMeasures: { type: String, required: true },
  insuranceProvider: { type: String, required: true },
  insurancePolicyNumber: { type: String, required: true },
  complianceOfficer: { type: String, required: true },
  emergencyContact: { type: String, required: true },
  termsAccepted: { type: Boolean, required: true },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  reviewedAt: {
    type: Date,
  },
  reviewNotes: {
    type: String,
  }
});

module.exports = mongoose.model("MedicineVerification", MedicineVerificationSchema);
