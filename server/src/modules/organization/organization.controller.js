import { organizationService } from './organization.service.js';

export const getOrganizationController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    res.status(200).json({
      success: true,
      data: org,
      message: 'Organization retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const updateOrganizationController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const updated = await organizationService.updateOrganization(org._id, req.body);
    res.status(200).json({
      success: true,
      data: updated,
      message: 'Organization updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getLocationsController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const locations = await organizationService.getLocations(org._id);
    res.status(200).json({
      success: true,
      data: locations,
      message: 'Locations retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const createLocationController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const location = await organizationService.createLocation(org._id, req.body);
    res.status(201).json({
      success: true,
      data: location,
      message: 'Location created successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getDepartmentsController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const departments = await organizationService.getDepartments(org._id);
    res.status(200).json({
      success: true,
      data: departments,
      message: 'Departments retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const createDepartmentController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const department = await organizationService.createDepartment(org._id, req.body);
    res.status(201).json({
      success: true,
      data: department,
      message: 'Department created successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getDesignationsController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const { departmentId } = req.query;
    const designations = await organizationService.getDesignations(org._id, departmentId);
    res.status(200).json({
      success: true,
      data: designations,
      message: 'Designations retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const createDesignationController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const designation = await organizationService.createDesignation(org._id, req.body);
    res.status(201).json({
      success: true,
      data: designation,
      message: 'Designation created successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getOrganizationMasterController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const [departments, designations, locations] = await Promise.all([
      organizationService.getDepartments(org._id),
      organizationService.getDesignations(org._id),
      organizationService.getLocations(org._id),
    ]);

    res.status(200).json({
      success: true,
      data: {
        organization: org,
        departments,
        designations,
        locations,
      },
      message: 'Organization master data retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};
