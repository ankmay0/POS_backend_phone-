import { BaseRepository } from './BaseRepository.js';

/**
 * Order Repository
 * Handles all order-related database operations
 * Extends BaseRepository for common CRUD operations
 */
export class OrderRepository extends BaseRepository {
  constructor(orderModel) {
    super(orderModel);
  }

  /**
   * Get active orders (not completed)
   */
  async findActiveOrders() {
    return await this.findAll(
      { status: { $ne: 'Completed' } },
      { sort: { createdAt: -1 } }
    );
  }

  /**
   * Get occupied tables (complex aggregation)
   */
  async getOccupiedTables() {
    return await this.model.aggregate([
      { 
        $match: { 
          status: { $ne: "Completed" }, 
          isInRestaurant: true 
        } 
      },
      {
        $project: {
          tables: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ["$tables", []] } }, 0] },
              then: "$tables",
              else: [{ tableNumber: "$tableNumber", chairIndices: "$chairIndices" }]
            }
          }
        }
      },
      { $unwind: "$tables" },
      {
        $group: {
          _id: "$tables.tableNumber",
          allChairs: { $push: "$tables.chairIndices" }
        }
      }
    ]);
  }

  /**
   * Find orders by user
   */
  async findByUser(userId, userEmail) {
    return await this.findAll({
      $or: [
        { userId: userId },
        { userEmail: userEmail }
      ]
    });
  }

  /**
   * Find user's active orders
   */
  async findUserActiveOrders(userId, userEmail) {
    return await this.findAll({
      $and: [
        {
          $or: [
            { userId: userId },
            { userEmail: userEmail }
          ]
        },
        { status: { $ne: 'Completed' } }
      ]
    });
  }
}
