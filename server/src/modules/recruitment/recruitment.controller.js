import { recruitmentService } from './recruitment.service.js';

export const createRequisitionController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const requisition = await recruitmentService.createRequisition(orgId, req.body, req.user._id);
    res.status(201).json({
      success: true,
      data: requisition,
      message: 'Job requisition created successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getRequisitionsController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const requisitions = await recruitmentService.getRequisitions(orgId, req.query);
    res.status(200).json({
      success: true,
      data: requisitions,
      message: 'Job requisitions retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getRequisitionByIdController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const result = await recruitmentService.getRequisitionById(orgId, req.params.id);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Job requisition details retrieved',
    });
  } catch (error) {
    next(error);
  }
};

export const updateRequisitionController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const requisition = await recruitmentService.updateRequisition(orgId, req.params.id, req.body, req.user._id);
    res.status(200).json({
      success: true,
      data: requisition,
      message: 'Job requisition updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const addCandidateController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const candidate = await recruitmentService.addCandidate(orgId, req.body, req.user._id);
    res.status(201).json({
      success: true,
      data: candidate,
      message: 'Candidate application added successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getCandidatesController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const candidates = await recruitmentService.getCandidates(orgId, req.query);
    res.status(200).json({
      success: true,
      data: candidates,
      message: 'Candidates retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const updateCandidateStageController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const candidate = await recruitmentService.updateCandidateStage(orgId, req.params.id, req.body, req.user._id);
    res.status(200).json({
      success: true,
      data: candidate,
      message: `Candidate updated to stage ${candidate.stage}`,
    });
  } catch (error) {
    next(error);
  }
};

export const convertCandidateToEmployeeController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const result = await recruitmentService.convertCandidateToEmployee(orgId, req.params.id, req.body, req.user._id);
    res.status(200).json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
