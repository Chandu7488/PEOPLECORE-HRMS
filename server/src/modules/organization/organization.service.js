import { Organization } from './organization.model.js';
import { Location } from './location.model.js';
import { Department } from './department.model.js';
import { Designation } from './designation.model.js';

/**
 * Organization Service
 * Manages organization profile and master data hierarchy
 */
export class OrganizationService {
  /**
   * Retrieves the primary organization or creates default if none exists
   */
  async getOrCreatePrimaryOrganization() {
    let org = await Organization.findOne();
    if (!org) {
      org = await Organization.create({
        name: 'PeopleCore Technologies Ltd.',
        legalName: 'PeopleCore Technologies Private Limited',
        code: 'PCORE',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        address: {
          street: 'Outer Ring Road, Bellandur',
          city: 'Bengaluru',
          state: 'Karnataka',
          country: 'India',
          pincode: '560103',
        },
        contactEmail: 'contact@peoplecore.local',
        phone: '+91 80 4000 1234',
        website: 'https://peoplecore.local',
      });
    }
    return org;
  }

  /**
   * Updates organization profile
   * @param {string} orgId - Organization ID
   * @param {object} updateData - Updated fields
   */
  async updateOrganization(orgId, updateData) {
    const org = await Organization.findByIdAndUpdate(orgId, updateData, {
      new: true,
      runValidators: true,
    });
    if (!org) {
      throw { statusCode: 404, code: 'ORG_NOT_FOUND', message: 'Organization not found' };
    }
    return org;
  }

  // --- Locations ---
  async getLocations(orgId) {
    return await Location.find({ organizationId: orgId }).sort({ isHeadquarters: -1, name: 1 });
  }

  async createLocation(orgId, locationData) {
    const code = (locationData.code || '').toUpperCase().trim();
    const existing = await Location.findOne({ organizationId: orgId, code });
    if (existing) {
      throw { statusCode: 409, code: 'DUPLICATE_LOCATION', message: `Location with code '${code}' already exists` };
    }
    return await Location.create({ ...locationData, code, organizationId: orgId });
  }

  // --- Departments ---
  async getDepartments(orgId) {
    return await Department.find({ organizationId: orgId })
      .populate('headOfDepartment', 'firstName lastName employeeCode')
      .sort({ name: 1 });
  }

  async createDepartment(orgId, deptData) {
    const code = (deptData.code || '').toUpperCase().trim();
    const existing = await Department.findOne({ organizationId: orgId, code });
    if (existing) {
      throw { statusCode: 409, code: 'DUPLICATE_DEPARTMENT', message: `Department with code '${code}' already exists` };
    }
    return await Department.create({ ...deptData, code, organizationId: orgId });
  }

  // --- Designations ---
  async getDesignations(orgId, departmentId = null) {
    const filter = { organizationId: orgId };
    if (departmentId) filter.departmentId = departmentId;
    return await Designation.find(filter).populate('departmentId', 'name code').sort({ title: 1 });
  }

  async createDesignation(orgId, desigData) {
    const code = (desigData.code || '').toUpperCase().trim();
    const existing = await Designation.findOne({ organizationId: orgId, code });
    if (existing) {
      throw { statusCode: 409, code: 'DUPLICATE_DESIGNATION', message: `Designation with code '${code}' already exists` };
    }
    return await Designation.create({ ...desigData, code, organizationId: orgId });
  }
}

export const organizationService = new OrganizationService();
