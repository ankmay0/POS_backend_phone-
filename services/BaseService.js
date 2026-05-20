/**
 * Base Service Class
 * Provides common business logic operations
 * Follows SRP (Single Responsibility Principle)
 */
export class BaseService {
  constructor(repository) {
    if (!repository) {
      throw new Error('Repository is required for service');
    }
    this.repository = repository;
  }

  /**
   * Get all items
   */
  async getAll(filter = {}, options = {}) {
    return await this.repository.findAll(filter, options);
  }

  /**
   * Get item by ID
   */
  async getById(id) {
    const item = await this.repository.findById(id);
    if (!item) {
      throw new Error('Item not found');
    }
    return item;
  }

  /**
   * Create new item
   */
  async create(data) {
    return await this.repository.create(data);
  }

  /**
   * Update item
   */
  async update(id, data) {
    const item = await this.repository.update(id, data);
    if (!item) {
      throw new Error('Item not found');
    }
    return item;
  }

  /**
   * Delete item
   */
  async delete(id) {
    const item = await this.repository.delete(id);
    if (!item) {
      throw new Error('Item not found');
    }
    return item;
  }

  /**
   * Check if item exists
   */
  async exists(filter) {
    return await this.repository.exists(filter);
  }
}
