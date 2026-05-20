/**
 * Base Repository Class
 * Provides common database operations following DIP (Dependency Inversion Principle)
 * All specific repositories extend this class
 */
export class BaseRepository {
  constructor(model) {
    if (!model) {
      throw new Error('Model is required for repository');
    }
    this.model = model;
  }

  /**
   * Find all documents with optional filtering
   */
  async findAll(filter = {}, options = {}) {
    const query = this.model.find(filter);
    
    if (options.sort) {
      query.sort(options.sort);
    } else {
      query.sort({ createdAt: -1 }); // Default: newest first
    }
    
    if (options.limit) {
      query.limit(options.limit);
    }
    
    if (options.skip) {
      query.skip(options.skip);
    }
    
    if (options.populate) {
      query.populate(options.populate);
    }
    
    return await query.exec();
  }

  /**
   * Find document by ID
   */
  async findById(id) {
    return await this.model.findById(id);
  }

  /**
   * Find one document by filter
   */
  async findOne(filter) {
    return await this.model.findOne(filter);
  }

  /**
   * Create new document
   */
  async create(data) {
    return await this.model.create(data);
  }

  /**
   * Create multiple documents
   */
  async createMany(dataArray) {
    return await this.model.insertMany(dataArray);
  }

  /**
   * Update document by ID
   */
  async update(id, data) {
    return await this.model.findByIdAndUpdate(id, data, { 
      new: true, // Return updated document
      runValidators: true // Run model validators
    });
  }

  /**
   * Update many documents
   */
  async updateMany(filter, data) {
    return await this.model.updateMany(filter, data);
  }

  /**
   * Delete document by ID
   */
  async delete(id) {
    return await this.model.findByIdAndDelete(id);
  }

  /**
   * Delete many documents
   */
  async deleteMany(filter) {
    return await this.model.deleteMany(filter);
  }

  /**
   * Count documents
   */
  async count(filter = {}) {
    return await this.model.countDocuments(filter);
  }

  /**
   * Check if document exists
   */
  async exists(filter) {
    const count = await this.model.countDocuments(filter).limit(1);
    return count > 0;
  }
}
