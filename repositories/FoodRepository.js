import { BaseRepository } from './BaseRepository.js';

/**
 * Food Repository
 * Handles all food-related database operations
 */
export class FoodRepository extends BaseRepository {
  constructor(foodModel) {
    super(foodModel);
  }

  /**
   * Find foods by category
   */
  async findByCategory(category) {
    return await this.findAll({ category });
  }

  /**
   * Find foods by type (Veg/Non-Veg/Other)
   */
  async findByType(type) {
    return await this.findAll({ type });
  }

  /**
   * Search foods by name
   */
  async searchByName(searchTerm) {
    return await this.findAll({
      name: { $regex: searchTerm, $options: 'i' } // Case-insensitive search
    });
  }
}
