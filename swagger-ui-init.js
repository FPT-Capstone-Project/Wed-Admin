
window.onload = function() {
  // Build a system
  var url = window.location.search.match(/url=([^&]+)/);
  if (url && url.length > 1) {
    url = decodeURIComponent(url[1]);
  } else {
    url = window.location.origin;
  }
  var options = {
  "swaggerDoc": {
    "openapi": "3.0.3",
    "info": {
      "title": "Capstone Backend API",
      "version": "1.0.0",
      "description": "Authentication and user API using JWT."
    },
    "servers": [
      {
        "url": "https://mcms-h5g5dtdzajf0bebm.eastasia-01.azurewebsites.net",
        "description": "API server"
      }
    ],
    "tags": [
      {
        "name": "Health",
        "description": "Server health check"
      },
      {
        "name": "Authentication",
        "description": "Register, login and current user"
      },
      {
        "name": "Auth OTP",
        "description": "Email OTP registration and password flows"
      },
      {
        "name": "Users",
        "description": "Authenticated user resources"
      },
      {
        "name": "Mushroom Types",
        "description": "CRUD for mushroom types catalog"
      },
      {
        "name": "Mushroom Conditions",
        "description": "CRUD for mushroom growth conditions per mushroom type"
      },
      {
        "name": "Rental Packages",
        "description": "CRUD for rental packages"
      },
      {
        "name": "Cultivation Rooms",
        "description": "Manage cultivation rooms"
      },
      {
        "name": "Cultivation Trays",
        "description": "Manage cultivation trays"
      },
      {
        "name": "Orders",
        "description": "Customer cultivation orders for packages, mushroom types, and tray quantities"
      },
      {
        "name": "Cultivation Sessions",
        "description": "WF-03: assign floor and trays, monitor growth, then confirm harvest readiness separately"
      },
      {
        "name": "Cultivation Audit",
        "description": "Supporting tray inspections, images, incidents, and immutable growth history; not required lifecycle steps"
      },
      {
        "name": "Harvests",
        "description": "WF-04 harvest lifecycle, actual yield, and order history"
      },
      {
        "name": "Harvest Requests",
        "description": "WF-04 customer receiving method, pickup schedule, and handover completion"
      },
      {
        "name": "Farm Spawn Workflow",
        "description": "Farm spawn handling and customer cultivation tracking"
      },
      {
        "name": "Disease Management",
        "description": "WF-06 issue diagnosis, expert consultations, treatments, media, and customer timelines"
      },
      {
        "name": "Payments",
        "description": "PayOS checkout payments for customer orders"
      },
      {
        "name": "Notifications",
        "description": "Customer notifications linked to cultivation sessions"
      },
      {
        "name": "IoT",
        "description": "SmartMush telemetry and manual SSR commands"
      },
      {
        "name": "Automatic misting",
        "description": "Explicit per-floor Save, Start and Stop control"
      }
    ],
    "components": {
      "securitySchemes": {
        "bearerAuth": {
          "type": "http",
          "scheme": "bearer",
          "bearerFormat": "JWT"
        }
      },
      "schemas": {
        "RegisterRequest": {
          "type": "object",
          "required": [
            "email",
            "password",
            "fullName"
          ],
          "properties": {
            "email": {
              "type": "string",
              "format": "email",
              "example": "user@example.com"
            },
            "password": {
              "type": "string",
              "minLength": 8,
              "example": "password123"
            },
            "fullName": {
              "type": "string",
              "example": "Nguyen Van A"
            },
            "name": {
              "type": "string",
              "description": "Alias for fullName"
            },
            "roleId": {
              "type": "integer",
              "minimum": 1,
              "example": 3,
              "description": "Optional; role IDs: 1 = Admin, 2 = Farm Operator, 3 = Customer. Without roleId, Customer (3) is assigned."
            },
            "phone": {
              "type": "string",
              "example": "0900000000"
            },
            "address": {
              "type": "string",
              "example": "Ho Chi Minh City"
            }
          }
        },
        "LoginRequest": {
          "type": "object",
          "required": [
            "email",
            "password"
          ],
          "properties": {
            "email": {
              "type": "string",
              "format": "email",
              "example": "user@example.com"
            },
            "password": {
              "type": "string",
              "example": "password123"
            }
          }
        },
        "User": {
          "type": "object",
          "properties": {
            "user_id": {
              "type": "integer",
              "example": 1
            },
            "role_id": {
              "type": "integer",
              "example": 2
            },
            "email": {
              "type": "string",
              "format": "email",
              "example": "user@example.com"
            },
            "full_name": {
              "type": "string",
              "example": "Nguyen Van A"
            },
            "phone": {
              "type": "string",
              "nullable": true,
              "example": "0900000000"
            },
            "address": {
              "type": "string",
              "nullable": true,
              "example": "Ho Chi Minh City"
            },
            "status": {
              "type": "string",
              "example": "ACTIVE"
            },
            "created_at": {
              "type": "string",
              "format": "date-time"
            },
            "updated_at": {
              "type": "string",
              "format": "date-time"
            }
          }
        },
        "Notification": {
          "type": "object",
          "properties": {
            "notification_id": {
              "type": "integer",
              "example": 10
            },
            "notification_type": {
              "type": "string",
              "example": "CULTIVATION_STARTED"
            },
            "title": {
              "type": "string",
              "example": "Cultivation update"
            },
            "message": {
              "type": "string",
              "example": "Your cultivation session has started."
            },
            "is_read": {
              "type": "boolean",
              "example": false
            },
            "created_at": {
              "type": "string",
              "format": "date-time"
            },
            "read_at": {
              "type": "string",
              "format": "date-time",
              "nullable": true
            },
            "reference_type": {
              "type": "string",
              "nullable": true,
              "example": "CULTIVATION_SESSION"
            },
            "reference_id": {
              "type": "integer",
              "nullable": true,
              "example": 12
            }
          }
        },
        "SentCultivationNotification": {
          "type": "object",
          "properties": {
            "notification_id": {
              "type": "integer",
              "example": 10
            },
            "user_id": {
              "type": "integer",
              "example": 3
            },
            "reference_type": {
              "type": "string",
              "example": "CULTIVATION_SESSION"
            },
            "reference_id": {
              "type": "integer",
              "example": 12
            },
            "notification_type": {
              "type": "string",
              "enum": [
                "OPERATOR_MESSAGE",
                "MUSHROOM_DISEASE",
                "DEVICE_ISSUE"
              ]
            },
            "title": {
              "type": "string",
              "example": "Cultivation update"
            },
            "message": {
              "type": "string",
              "example": "Your cultivation session has started."
            },
            "created_at": {
              "type": "string",
              "format": "date-time"
            }
          }
        },
        "CreateCultivationNotificationRequest": {
          "type": "object",
          "required": [
            "message"
          ],
          "properties": {
            "message": {
              "type": "string",
              "minLength": 1,
              "maxLength": 1000,
              "example": "Your cultivation session is ready for the next stage."
            },
            "title": {
              "type": "string",
              "minLength": 1,
              "maxLength": 100,
              "default": "Thông báo từ SmartMush Farm"
            },
            "type": {
              "type": "string",
              "enum": [
                "OPERATOR_MESSAGE",
                "MUSHROOM_DISEASE",
                "DEVICE_ISSUE"
              ],
              "default": "OPERATOR_MESSAGE"
            }
          }
        },
        "UserWithRole": {
          "type": "object",
          "properties": {
            "user_id": {
              "type": "integer",
              "example": 1
            },
            "role_id": {
              "type": "integer",
              "example": 3
            },
            "role_name": {
              "type": "string",
              "example": "Customer"
            },
            "role_description": {
              "type": "string",
              "nullable": true
            },
            "email": {
              "type": "string",
              "format": "email",
              "example": "user@example.com"
            },
            "full_name": {
              "type": "string",
              "example": "Nguyen Van A"
            },
            "phone": {
              "type": "string",
              "nullable": true,
              "example": "0900000000"
            },
            "address": {
              "type": "string",
              "nullable": true,
              "example": "Ho Chi Minh City"
            },
            "status": {
              "type": "string",
              "enum": [
                "ACTIVE",
                "INACTIVE",
                "BLOCKED"
              ],
              "example": "ACTIVE"
            },
            "created_at": {
              "type": "string",
              "format": "date-time"
            },
            "updated_at": {
              "type": "string",
              "format": "date-time"
            }
          }
        },
        "UserAccountDetail": {
          "allOf": [
            {
              "$ref": "#/components/schemas/UserWithRole"
            },
            {
              "type": "object",
              "properties": {
                "order_count": {
                  "type": "integer",
                  "minimum": 0,
                  "example": 12
                },
                "cultivation_session_count": {
                  "type": "integer",
                  "minimum": 0,
                  "example": 4
                }
              }
            }
          ]
        },
        "CreateManagedUserRequest": {
          "type": "object",
          "required": [
            "email",
            "password",
            "fullName",
            "roleId"
          ],
          "properties": {
            "email": {
              "type": "string",
              "format": "email",
              "example": "staff@example.com"
            },
            "password": {
              "type": "string",
              "minLength": 8,
              "example": "password123"
            },
            "fullName": {
              "type": "string",
              "example": "Nguyen Van A"
            },
            "roleId": {
              "type": "integer",
              "minimum": 1,
              "example": 2
            },
            "phone": {
              "type": "string",
              "example": "0900000000"
            },
            "address": {
              "type": "string",
              "example": "Ho Chi Minh City"
            }
          }
        },
        "UpdateUserStatusRequest": {
          "type": "object",
          "required": [
            "status"
          ],
          "properties": {
            "status": {
              "type": "string",
              "enum": [
                "ACTIVE",
                "INACTIVE",
                "BLOCKED"
              ],
              "example": "BLOCKED"
            }
          }
        },
        "MushroomType": {
          "type": "object",
          "properties": {
            "mushroom_type_id": {
              "type": "integer",
              "example": 1
            },
            "name": {
              "type": "string",
              "example": "King Oyster"
            },
            "description": {
              "type": "string",
              "nullable": true,
              "example": "Mushroom type for soups and hotpot"
            },
            "growing_days": {
              "type": "integer",
              "example": 25
            },
            "price": {
              "type": "number",
              "format": "double",
              "example": 120000
            },
            "image_url": {
              "type": "string",
              "nullable": true,
              "example": "https://example.com/image.jpg"
            },
            "status": {
              "type": "string",
              "enum": [
                "ACTIVE",
                "INACTIVE"
              ],
              "example": "ACTIVE"
            },
            "created_at": {
              "type": "string",
              "format": "date-time"
            }
          }
        },
        "CreateMushroomTypeRequest": {
          "type": "object",
          "required": [
            "name",
            "growingDays",
            "price"
          ],
          "properties": {
            "name": {
              "type": "string",
              "example": "King Oyster"
            },
            "description": {
              "type": "string",
              "example": "Mushroom type for soups and hotpot"
            },
            "growingDays": {
              "type": "integer",
              "example": 25
            },
            "price": {
              "type": "number",
              "example": 120000
            },
            "imageUrl": {
              "type": "string",
              "example": "https://example.com/image.jpg"
            },
            "status": {
              "type": "string",
              "enum": [
                "ACTIVE",
                "INACTIVE"
              ],
              "example": "ACTIVE"
            }
          }
        },
        "UpdateMushroomTypeRequest": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "example": "King Oyster Premium"
            },
            "description": {
              "type": "string",
              "example": "Updated description"
            },
            "growingDays": {
              "type": "integer",
              "example": 30
            },
            "price": {
              "type": "number",
              "example": 150000
            },
            "imageUrl": {
              "type": "string",
              "example": "https://example.com/new-image.jpg"
            },
            "status": {
              "type": "string",
              "enum": [
                "ACTIVE",
                "INACTIVE"
              ],
              "example": "INACTIVE"
            }
          }
        },
        "RentalPackage": {
          "type": "object",
          "properties": {
            "package_id": {
              "type": "integer",
              "example": 1
            },
            "package_name": {
              "type": "string",
              "example": "Standard 30-day package"
            },
            "description": {
              "type": "string",
              "nullable": true,
              "example": "Includes one cultivation tray"
            },
            "duration_days": {
              "type": "integer",
              "example": 30
            },
            "price": {
              "type": "number",
              "format": "double",
              "example": 500000
            },
            "status": {
              "type": "string",
              "enum": [
                "ACTIVE",
                "INACTIVE"
              ],
              "example": "ACTIVE"
            }
          }
        },
        "CreateRentalPackageRequest": {
          "type": "object",
          "required": [
            "packageName",
            "durationDays",
            "price"
          ],
          "properties": {
            "packageName": {
              "type": "string",
              "example": "Standard 30-day package"
            },
            "description": {
              "type": "string",
              "example": "Includes one cultivation tray"
            },
            "durationDays": {
              "type": "integer",
              "example": 30
            },
            "price": {
              "type": "number",
              "example": 500000
            },
            "status": {
              "type": "string",
              "enum": [
                "ACTIVE",
                "INACTIVE"
              ],
              "example": "ACTIVE"
            }
          }
        },
        "UpdateRentalPackageRequest": {
          "type": "object",
          "properties": {
            "packageName": {
              "type": "string",
              "example": "Premium 30-day package"
            },
            "description": {
              "type": "string",
              "example": "Updated package details"
            },
            "durationDays": {
              "type": "integer",
              "example": 30
            },
            "price": {
              "type": "number",
              "example": 550000
            },
            "status": {
              "type": "string",
              "enum": [
                "ACTIVE",
                "INACTIVE"
              ],
              "example": "INACTIVE"
            }
          }
        },
        "CreateCultivationOrderRequest": {
          "type": "object",
          "required": [
            "packageId",
            "mushroomTypeId",
            "quantity"
          ],
          "properties": {
            "packageId": {
              "type": "integer",
              "example": 1,
              "description": "Selected active cultivation package. Its database duration must cover the mushroom growing days."
            },
            "mushroomTypeId": {
              "type": "integer",
              "example": 2,
              "description": "Selected mushroom type."
            },
            "quantity": {
              "type": "integer",
              "minimum": 1,
              "example": 3,
              "description": "Number of cultivation trays requested."
            }
          }
        },
        "PayosPaymentResponse": {
          "type": "object",
          "required": [
            "success",
            "message",
            "data"
          ],
          "properties": {
            "success": {
              "type": "boolean",
              "example": true
            },
            "message": {
              "type": "string",
              "example": "PayOS payment created successfully"
            },
            "data": {
              "type": "object",
              "required": [
                "paymentId",
                "orderCode",
                "orderId",
                "amount",
                "checkoutUrl",
                "expiresAt",
                "paymentStatus"
              ],
              "properties": {
                "paymentId": {
                  "type": "integer",
                  "example": 34
                },
                "orderCode": {
                  "type": "integer",
                  "example": 34,
                  "description": "PayOS order code"
                },
                "orderId": {
                  "type": "integer",
                  "example": 12
                },
                "amount": {
                  "type": "integer",
                  "example": 530000
                },
                "checkoutUrl": {
                  "type": "string",
                  "format": "uri",
                  "example": "https://pay.payos.vn/web/abc123"
                },
                "qrCode": {
                  "type": "string",
                  "nullable": true,
                  "example": "000201010212..."
                },
                "expiresAt": {
                  "type": "integer",
                  "format": "int64",
                  "example": 1735689600,
                  "description": "Unix timestamp in seconds"
                },
                "paymentStatus": {
                  "type": "string",
                  "enum": [
                    "PENDING",
                    "PAID",
                    "FAILED",
                    "REFUNDED",
                    "CANCELLED"
                  ],
                  "example": "PENDING"
                }
              }
            }
          }
        },
        "PaymentStatusResponse": {
          "type": "object",
          "required": [
            "success",
            "data"
          ],
          "properties": {
            "success": {
              "type": "boolean",
              "example": true
            },
            "data": {
              "type": "object",
              "required": [
                "orderId",
                "orderStatus",
                "paymentStatus",
                "paymentCode",
                "amount"
              ],
              "properties": {
                "orderId": {
                  "type": "integer",
                  "example": 12
                },
                "orderStatus": {
                  "type": "string",
                  "enum": [
                    "PENDING",
                    "CONFIRMED",
                    "PROCESSING",
                    "COMPLETED",
                    "CANCELLED"
                  ],
                  "description": "Becomes PROCESSING after a successful PayOS payment and cultivation allocation.",
                  "example": "PENDING"
                },
                "paymentStatus": {
                  "type": "string",
                  "enum": [
                    "UNPAID",
                    "PENDING",
                    "PAID",
                    "FAILED",
                    "REFUND_PENDING",
                    "REFUNDED"
                  ],
                  "example": "PENDING"
                },
                "paymentCode": {
                  "type": "string",
                  "example": "34",
                  "description": "PayOS order code for the latest payment"
                },
                "amount": {
                  "type": "number",
                  "example": 530000
                }
              }
            }
          }
        },
        "CultivationRoom": {
          "type": "object",
          "properties": {
            "room_id": {
              "type": "integer",
              "example": 1
            },
            "room_code": {
              "type": "string",
              "example": "ROOM-01"
            },
            "room_name": {
              "type": "string",
              "example": "Growing room 1"
            },
            "description": {
              "type": "string",
              "nullable": true,
              "example": "Main cultivation room"
            },
            "capacity": {
              "type": "integer",
              "example": 20
            },
            "status": {
              "type": "string",
              "enum": [
                "ACTIVE",
                "INACTIVE",
                "MAINTENANCE"
              ],
              "example": "ACTIVE"
            },
            "created_at": {
              "type": "string",
              "format": "date-time"
            },
            "updated_at": {
              "type": "string",
              "format": "date-time"
            }
          }
        },
        "CreateCultivationRoomRequest": {
          "type": "object",
          "required": [
            "roomCode",
            "roomName"
          ],
          "properties": {
            "roomCode": {
              "type": "string",
              "example": "ROOM-01"
            },
            "roomName": {
              "type": "string",
              "example": "Growing room 1"
            },
            "description": {
              "type": "string",
              "example": "Main cultivation room"
            },
            "capacity": {
              "type": "integer",
              "example": 20
            },
            "status": {
              "type": "string",
              "enum": [
                "ACTIVE",
                "INACTIVE",
                "MAINTENANCE"
              ],
              "example": "ACTIVE"
            }
          }
        },
        "UpdateCultivationRoomRequest": {
          "type": "object",
          "properties": {
            "roomCode": {
              "type": "string",
              "example": "ROOM-01"
            },
            "roomName": {
              "type": "string",
              "example": "Growing room 1"
            },
            "description": {
              "type": "string",
              "nullable": true
            },
            "capacity": {
              "type": "integer",
              "example": 24
            },
            "status": {
              "type": "string",
              "enum": [
                "ACTIVE",
                "INACTIVE",
                "MAINTENANCE"
              ]
            }
          }
        },
        "CultivationTray": {
          "type": "object",
          "properties": {
            "tray_id": {
              "type": "integer",
              "example": 1
            },
            "room_id": {
              "type": "integer",
              "example": 1
            },
            "room_code": {
              "type": "string",
              "example": "ROOM-01"
            },
            "room_name": {
              "type": "string",
              "example": "Growing room 1"
            },
            "floor_id": {
              "type": "integer",
              "nullable": true,
              "example": 1
            },
            "floor_number": {
              "type": "integer",
              "nullable": true,
              "example": 1
            },
            "floor_name": {
              "type": "string",
              "nullable": true,
              "example": "Floor 1"
            },
            "tray_code": {
              "type": "string",
              "example": "TRAY-01"
            },
            "tray_name": {
              "type": "string",
              "nullable": true,
              "example": "Rack A, level 1"
            },
            "status": {
              "type": "string",
              "enum": [
                "AVAILABLE",
                "OCCUPIED",
                "MAINTENANCE",
                "INACTIVE"
              ],
              "example": "AVAILABLE"
            },
            "created_at": {
              "type": "string",
              "format": "date-time"
            },
            "updated_at": {
              "type": "string",
              "format": "date-time"
            }
          }
        },
        "CreateCultivationTrayRequest": {
          "type": "object",
          "required": [
            "roomId",
            "trayCode"
          ],
          "properties": {
            "roomId": {
              "type": "integer",
              "example": 1
            },
            "floorId": {
              "type": "integer",
              "nullable": true,
              "example": 1,
              "description": "Optional floor within the selected room. Trays without a floor cannot start cultivation."
            },
            "trayCode": {
              "type": "string",
              "example": "TRAY-01"
            },
            "trayName": {
              "type": "string",
              "example": "Rack A, level 1"
            },
            "status": {
              "type": "string",
              "enum": [
                "AVAILABLE",
                "OCCUPIED",
                "MAINTENANCE",
                "INACTIVE"
              ],
              "example": "AVAILABLE"
            }
          }
        },
        "UpdateCultivationTrayRequest": {
          "type": "object",
          "properties": {
            "roomId": {
              "type": "integer",
              "example": 1
            },
            "floorId": {
              "type": "integer",
              "nullable": true,
              "example": 1,
              "description": "Assign a floor in the selected room, or null to unassign it."
            },
            "trayCode": {
              "type": "string",
              "example": "TRAY-01"
            },
            "trayName": {
              "type": "string",
              "nullable": true
            },
            "status": {
              "type": "string",
              "enum": [
                "AVAILABLE",
                "OCCUPIED",
                "MAINTENANCE",
                "INACTIVE"
              ]
            }
          }
        },
        "MushroomCondition": {
          "type": "object",
          "properties": {
            "condition_id": {
              "type": "integer",
              "example": 1
            },
            "mushroom_type_id": {
              "type": "integer",
              "example": 1
            },
            "temperature_min": {
              "type": "number",
              "nullable": true,
              "example": 18
            },
            "temperature_max": {
              "type": "number",
              "nullable": true,
              "example": 24
            },
            "humidity_min": {
              "type": "number",
              "nullable": true,
              "example": 80
            },
            "humidity_max": {
              "type": "number",
              "nullable": true,
              "example": 90
            },
            "created_at": {
              "type": "string",
              "format": "date-time"
            },
            "updated_at": {
              "type": "string",
              "format": "date-time"
            }
          }
        },
        "CreateMushroomConditionRequest": {
          "type": "object",
          "required": [
            "mushroomTypeId"
          ],
          "properties": {
            "mushroomTypeId": {
              "type": "integer",
              "example": 1
            },
            "temperatureMin": {
              "type": "number",
              "nullable": true,
              "example": 18
            },
            "temperatureMax": {
              "type": "number",
              "nullable": true,
              "example": 24
            },
            "humidityMin": {
              "type": "number",
              "nullable": true,
              "example": 80
            },
            "humidityMax": {
              "type": "number",
              "nullable": true,
              "example": 90
            }
          }
        },
        "UpdateMushroomConditionRequest": {
          "type": "object",
          "properties": {
            "mushroomTypeId": {
              "type": "integer",
              "example": 1
            },
            "temperatureMin": {
              "type": "number",
              "nullable": true,
              "example": 17
            },
            "temperatureMax": {
              "type": "number",
              "nullable": true,
              "example": 25
            },
            "humidityMin": {
              "type": "number",
              "nullable": true,
              "example": 75
            },
            "humidityMax": {
              "type": "number",
              "nullable": true,
              "example": 88
            }
          }
        },
        "AuthResponse": {
          "type": "object",
          "properties": {
            "message": {
              "type": "string",
              "example": "Login successful"
            },
            "token": {
              "type": "string",
              "example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            },
            "user": {
              "$ref": "#/components/schemas/User"
            }
          }
        },
        "Error": {
          "type": "object",
          "properties": {
            "message": {
              "type": "string",
              "example": "Nấm này đã có condition rồi",
              "description": "Business validation error. Each mushroom type can only have one condition."
            }
          }
        },
        "IotMaster": {
          "type": "object",
          "properties": {
            "id": {
              "type": "integer"
            },
            "masterId": {
              "type": "string",
              "example": "master01"
            },
            "cultivationRoomId": {
              "type": "integer",
              "nullable": true
            },
            "light_ssr_channel": {
              "type": "integer",
              "minimum": 1,
              "maximum": 8,
              "nullable": true,
              "description": "Room light SSR channel; null means unconfigured. Channel 3 maps to GPIO6."
            },
            "reportedStatus": {
              "type": "string",
              "enum": [
                "online",
                "offline"
              ],
              "nullable": true
            },
            "lastSeenAt": {
              "type": "string",
              "format": "date-time",
              "nullable": true,
              "description": "Last non-retained message arrival; not a connectivity guarantee."
            },
            "statusReceivedAt": {
              "type": "string",
              "format": "date-time",
              "nullable": true
            },
            "statusRetained": {
              "type": "boolean",
              "nullable": true
            }
          }
        },
        "IotSensor": {
          "type": "object",
          "properties": {
            "masterId": {
              "type": "string"
            },
            "nodeId": {
              "type": "integer",
              "minimum": 1,
              "maximum": 247
            },
            "sensorId": {
              "type": "integer",
              "minimum": 1,
              "maximum": 3
            },
            "temperature": {
              "type": "number",
              "nullable": true
            },
            "humidity": {
              "type": "number",
              "nullable": true
            },
            "ok": {
              "type": "boolean"
            },
            "lastReceivedAt": {
              "type": "string",
              "format": "date-time",
              "nullable": true
            },
            "lastValidAt": {
              "type": "string",
              "format": "date-time",
              "nullable": true
            },
            "measuredAt": {
              "type": "string",
              "format": "date-time",
              "nullable": true,
              "description": "Always null: firmware supplies no measurement timestamp."
            },
            "retained": {
              "type": "boolean"
            }
          }
        },
        "IotSensors": {
          "type": "object",
          "properties": {
            "masterId": {
              "type": "string"
            },
            "sensors": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/IotSensor"
              }
            }
          }
        },
        "IotHistory": {
          "type": "object",
          "properties": {
            "masterId": {
              "type": "string"
            },
            "nodeId": {
              "type": "integer",
              "minimum": 1,
              "maximum": 247
            },
            "sensorId": {
              "type": "integer",
              "minimum": 1,
              "maximum": 3
            },
            "limit": {
              "type": "integer"
            },
            "offset": {
              "type": "integer"
            },
            "readings": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string"
                  },
                  "temperature": {
                    "type": "number",
                    "nullable": true
                  },
                  "humidity": {
                    "type": "number",
                    "nullable": true
                  },
                  "ok": {
                    "type": "boolean"
                  },
                  "receivedAt": {
                    "type": "string",
                    "format": "date-time",
                    "nullable": true
                  },
                  "measuredAt": {
                    "type": "string",
                    "format": "date-time",
                    "nullable": true,
                    "description": "Always null: firmware supplies no measurement timestamp."
                  },
                  "retained": {
                    "type": "boolean"
                  }
                }
              }
            }
          }
        },
        "IotSsr": {
          "type": "object",
          "properties": {
            "masterId": {
              "type": "string"
            },
            "channels": {
              "type": "array",
              "minItems": 8,
              "maxItems": 8,
              "items": {
                "type": "object",
                "properties": {
                  "channel": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 8
                  },
                  "desiredState": {
                    "type": "string",
                    "enum": [
                      "ON",
                      "OFF"
                    ],
                    "nullable": true
                  },
                  "reportedState": {
                    "type": "string",
                    "enum": [
                      "ON",
                      "OFF"
                    ],
                    "nullable": true
                  },
                  "lastCommandAt": {
                    "type": "string",
                    "format": "date-time",
                    "nullable": true
                  },
                  "lastReportedAt": {
                    "type": "string",
                    "format": "date-time",
                    "nullable": true
                  },
                  "reportedRetained": {
                    "type": "boolean",
                    "nullable": true
                  },
                  "statesMatch": {
                    "type": "boolean",
                    "nullable": true,
                    "description": "Value comparison only; not command acknowledgment or physical verification."
                  }
                }
              }
            }
          }
        },
        "IotCommand": {
          "type": "object",
          "properties": {
            "commandId": {
              "type": "string",
              "format": "uuid"
            },
            "masterId": {
              "type": "string"
            },
            "channel": {
              "type": "integer",
              "minimum": 1,
              "maximum": 8
            },
            "action": {
              "type": "string",
              "enum": [
                "ON",
                "OFF"
              ]
            },
            "status": {
              "type": "string",
              "enum": [
                "PENDING",
                "PUBLISHED",
                "FAILED",
                "TIMED_OUT"
              ]
            },
            "requestedBy": {
              "type": "integer",
              "nullable": true
            },
            "requestedAt": {
              "type": "string",
              "format": "date-time",
              "nullable": true
            },
            "expiresAt": {
              "type": "string",
              "format": "date-time",
              "nullable": true
            },
            "publishedAt": {
              "type": "string",
              "format": "date-time",
              "nullable": true
            },
            "completedAt": {
              "type": "string",
              "format": "date-time",
              "nullable": true
            },
            "errorMessage": {
              "type": "string",
              "nullable": true
            }
          }
        },
        "AutoMistingConfiguration": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "humidity_min",
            "humidity_max",
            "humidity_start_threshold",
            "humidity_stop_threshold",
            "misting_pulse_ms",
            "cooldown_ms",
            "evaluation_interval_ms",
            "max_sensor_spread_percent",
            "max_activations_per_hour",
            "max_cumulative_on_ms_per_hour"
          ],
          "properties": {
            "mushroom_type_id": {
              "type": "integer",
              "minimum": 1,
              "maximum": 2147483647
            },
            "humidity_min": {
              "type": "number",
              "minimum": 0,
              "maximum": 100
            },
            "humidity_max": {
              "type": "number",
              "minimum": 0,
              "maximum": 100
            },
            "humidity_start_threshold": {
              "type": "number",
              "minimum": 0,
              "maximum": 100
            },
            "humidity_stop_threshold": {
              "type": "number",
              "minimum": 0,
              "maximum": 100
            },
            "misting_pulse_ms": {
              "type": "integer",
              "minimum": 1000,
              "maximum": 60000
            },
            "cooldown_ms": {
              "type": "integer",
              "minimum": 1000,
              "maximum": 86400000
            },
            "evaluation_interval_ms": {
              "type": "integer",
              "minimum": 1000,
              "maximum": 60000
            },
            "sensor_max_age_ms": {
              "type": "integer",
              "minimum": 1000,
              "maximum": 300000
            },
            "required_valid_sensors": {
              "type": "integer",
              "minimum": 1,
              "maximum": 3
            },
            "max_sensor_spread_percent": {
              "type": "number",
              "minimum": 0,
              "maximum": 100
            },
            "max_activations_per_hour": {
              "type": "integer",
              "minimum": 1,
              "maximum": 3600
            },
            "max_cumulative_on_ms_per_hour": {
              "type": "integer",
              "minimum": 1000,
              "maximum": 3600000
            },
            "profile_name": {
              "type": "string",
              "maxLength": 200,
              "nullable": true
            },
            "profile_approved": {
              "type": "boolean",
              "default": false
            },
            "mushroom_type_ids": {
              "type": "array",
              "minItems": 1,
              "uniqueItems": true,
              "items": {
                "type": "integer",
                "minimum": 1,
                "maximum": 2147483647
              },
              "description": "FLOOR only: approve crop types before assigning sessions. Server reads conditions and stores source_profiles. Must include all crops currently on the floor."
            },
            "config_source": {
              "type": "string",
              "enum": [
                "LEGACY",
                "FLOOR"
              ],
              "default": "LEGACY",
              "description": "FLOOR derives crop types from assigned tray sessions; requires a reviewed named profile. LEGACY requires mushroom_type_id."
            },
            "cooling_enabled": {
              "type": "boolean",
              "default": false,
              "description": "When true all temperature fields and cooling_humidity_limit are required."
            },
            "temperature_min": {
              "type": "number",
              "minimum": -40,
              "maximum": 80
            },
            "temperature_max": {
              "type": "number",
              "minimum": -40,
              "maximum": 80
            },
            "temperature_start_threshold": {
              "type": "number",
              "minimum": -40,
              "maximum": 80
            },
            "temperature_stop_threshold": {
              "type": "number",
              "minimum": -40,
              "maximum": 80
            },
            "cooling_humidity_limit": {
              "type": "number",
              "minimum": 0,
              "maximum": 100
            },
            "max_temperature_spread_c": {
              "type": "number",
              "minimum": 0,
              "maximum": 20
            }
          }
        },
        "CultivationFloorMapping": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "room_id",
            "floor_number",
            "floor_name",
            "master_id",
            "node_address",
            "misting_ssr_channel"
          ],
          "properties": {
            "room_id": {
              "type": "integer",
              "minimum": 1
            },
            "floor_number": {
              "type": "integer",
              "minimum": 1
            },
            "floor_name": {
              "type": "string",
              "maxLength": 200
            },
            "master_id": {
              "type": "integer",
              "minimum": 1
            },
            "node_address": {
              "type": "integer",
              "minimum": 1,
              "maximum": 247
            },
            "misting_ssr_channel": {
              "type": "integer",
              "minimum": 1,
              "maximum": 8
            },
            "status": {
              "type": "string",
              "enum": [
                "ACTIVE",
                "INACTIVE"
              ]
            },
            "total_rows": {
              "type": "integer",
              "minimum": 1,
              "maximum": 32767,
              "nullable": true
            },
            "total_columns": {
              "type": "integer",
              "minimum": 1,
              "maximum": 32767,
              "nullable": true
            }
          }
        }
      }
    },
    "paths": {
      "/health": {
        "get": {
          "tags": [
            "Health"
          ],
          "summary": "Check API health",
          "responses": {
            "200": {
              "description": "API is healthy",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "status": {
                        "type": "string",
                        "example": "ok"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/api/users/me": {
        "get": {
          "tags": [
            "Users"
          ],
          "summary": "Get the current authenticated user",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "responses": {
            "200": {
              "description": "Current user",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "user": {
                        "$ref": "#/components/schemas/User"
                      }
                    }
                  }
                }
              }
            },
            "401": {
              "description": "Missing or invalid JWT token"
            }
          }
        }
      },
      "/api/users": {
        "get": {
          "tags": [
            "Users"
          ],
          "summary": "List users with their roles",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "roleId",
              "description": "Filter users by role ID",
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "responses": {
            "200": {
              "description": "User list with role information",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "array",
                        "items": {
                          "$ref": "#/components/schemas/UserWithRole"
                        }
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid role ID"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Admin role is required"
            }
          }
        },
        "post": {
          "tags": [
            "Users"
          ],
          "summary": "Create a user account and assign a role",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateManagedUserRequest"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "User created successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "$ref": "#/components/schemas/UserAccountDetail"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid input or role does not exist"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Admin role is required"
            },
            "409": {
              "description": "Email is already registered"
            }
          }
        }
      },
      "/api/users/{userId}": {
        "get": {
          "tags": [
            "Users"
          ],
          "summary": "Get an account with role, order count, and cultivation session count",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "userId",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "responses": {
            "200": {
              "description": "User account detail",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "$ref": "#/components/schemas/UserAccountDetail"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid user ID"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Admin role is required"
            },
            "404": {
              "description": "User not found"
            }
          }
        }
      },
      "/api/users/{userId}/status": {
        "patch": {
          "tags": [
            "Users"
          ],
          "summary": "Update a user account status",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "userId",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UpdateUserStatusRequest"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "User status updated successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "$ref": "#/components/schemas/User"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid user ID or status"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Admin role is required"
            },
            "404": {
              "description": "User not found"
            }
          }
        }
      },
      "/api/rental-packages": {
        "get": {
          "tags": [
            "Rental Packages"
          ],
          "summary": "Get rental packages",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "status",
              "schema": {
                "type": "string",
                "enum": [
                  "ACTIVE",
                  "INACTIVE"
                ]
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Rental package list"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            }
          }
        },
        "post": {
          "tags": [
            "Rental Packages"
          ],
          "summary": "Create a rental package",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateRentalPackageRequest"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Rental package created successfully"
            },
            "400": {
              "description": "Validation failed"
            }
          }
        }
      },
      "/api/rental-packages/{id}": {
        "get": {
          "tags": [
            "Rental Packages"
          ],
          "summary": "Get a rental package by id",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Rental package detail"
            },
            "404": {
              "description": "Rental package not found"
            }
          }
        },
        "put": {
          "tags": [
            "Rental Packages"
          ],
          "summary": "Update a rental package",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UpdateRentalPackageRequest"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Rental package updated successfully"
            },
            "400": {
              "description": "Validation failed"
            },
            "404": {
              "description": "Rental package not found"
            }
          }
        },
        "delete": {
          "tags": [
            "Rental Packages"
          ],
          "summary": "Delete a rental package",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Rental package deleted successfully"
            },
            "404": {
              "description": "Rental package not found"
            },
            "409": {
              "description": "Package is referenced by an order and cannot be deleted"
            }
          }
        }
      },
      "/api/payments/orders/{orderId}/status": {
        "get": {
          "tags": [
            "Payments"
          ],
          "summary": "Get the current PayOS payment status for an order",
          "description": "Reads the authenticated customer's order and its latest PayOS payment. This endpoint never changes payment or order state.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "orderId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Current order and payment status",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/PaymentStatusResponse"
                  }
                }
              }
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "404": {
              "description": "Order or payment not found"
            }
          }
        }
      },
      "/api/payments/orders/{orderId}/payos/sync": {
        "post": {
          "tags": [
            "Payments"
          ],
          "summary": "Synchronize a PayOS payment after returning from checkout",
          "description": "Queries PayOS directly and updates local payment and fulfillment state only when PayOS confirms PAID. No payment status is accepted from the client.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "orderId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Current local payment state after synchronization"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "404": {
              "description": "Order or payment not found"
            },
            "409": {
              "description": "Payment could not be synchronized"
            },
            "502": {
              "description": "PayOS could not confirm the payment"
            },
            "503": {
              "description": "PayOS is not configured"
            }
          }
        }
      },
      "/api/payments/orders/{orderId}/payos": {
        "post": {
          "tags": [
            "Payments"
          ],
          "summary": "Create or reuse a PayOS payment link for an order",
          "description": "Rechecks cultivation tray and spawn capacity. A link is returned only while its linked resource hold remains active.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "orderId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "201": {
              "description": "PayOS payment link created",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/PayosPaymentResponse"
                  }
                }
              }
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "404": {
              "description": "Order not found for this customer"
            },
            "409": {
              "description": "Order cannot be paid"
            },
            "502": {
              "description": "PayOS payment link could not be created"
            },
            "503": {
              "description": "PayOS is not configured"
            }
          }
        }
      },
      "/api/payments/payos/webhook": {
        "get": {
          "tags": [
            "Payments"
          ],
          "summary": "Verify that the PayOS webhook URL is reachable",
          "responses": {
            "200": {
              "description": "Webhook URL is reachable"
            }
          }
        },
        "post": {
          "tags": [
            "Payments"
          ],
          "summary": "Receive a PayOS payment webhook",
          "description": "PayOS signs the data object with PAYOS_CHECKSUM_KEY. Invalid or already handled callbacks return HTTP 200 without changing payment state.",
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "code",
                    "success",
                    "data",
                    "signature"
                  ],
                  "properties": {
                    "code": {
                      "type": "string",
                      "example": "00"
                    },
                    "desc": {
                      "type": "string",
                      "example": "success"
                    },
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "object",
                      "properties": {
                        "orderCode": {
                          "type": "integer",
                          "example": 34
                        },
                        "amount": {
                          "type": "integer",
                          "example": 530000
                        },
                        "reference": {
                          "type": "string",
                          "example": "TF230204212323"
                        },
                        "code": {
                          "type": "string",
                          "example": "00"
                        }
                      }
                    },
                    "signature": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Webhook received"
            }
          }
        }
      },
      "/api/orders": {
        "get": {
          "tags": [
            "Orders"
          ],
          "summary": "List orders belonging to the authenticated customer",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "responses": {
            "200": {
              "description": "Customer order list",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "description": "One record per order, retaining all existing order fields. Names are joined with commas in item ID order; total_price sums item totals. Item summary fields are null for orders without items.",
                          "properties": {
                            "order_id": {
                              "type": "integer"
                            },
                            "user_id": {
                              "type": "integer"
                            },
                            "subtotal": {
                              "type": "string"
                            },
                            "discount": {
                              "type": "string"
                            },
                            "shipping_fee": {
                              "type": "string"
                            },
                            "total_amount": {
                              "type": "string"
                            },
                            "status": {
                              "type": "string"
                            },
                            "payment_status": {
                              "type": "string",
                              "description": "Current orders.payment_status"
                            },
                            "created_at": {
                              "type": "string",
                              "format": "date-time"
                            },
                            "updated_at": {
                              "type": "string",
                              "format": "date-time"
                            },
                            "package_name": {
                              "type": "string",
                              "nullable": true
                            },
                            "mushroom_name": {
                              "type": "string",
                              "nullable": true
                            },
                            "total_price": {
                              "type": "string",
                              "nullable": true
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            "401": {
              "description": "Missing or invalid JWT token"
            }
          }
        }
      },
      "/api/orders/admin": {
        "get": {
          "tags": [
            "Orders"
          ],
          "summary": "List orders from all customers for Admin and Farm Operator",
          "description": "Roles: 1 = Admin, 2 = Farm Operator, 3 = Customer. Only roles 1 and 2 may access. One record per order; names are comma-separated in item ID order, quantity and total_price sum all items. Item summaries are null without items. Payment status comes from orders.payment_status. No synthetic order_code is generated.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "page",
              "schema": {
                "type": "integer",
                "minimum": 1,
                "default": 1
              }
            },
            {
              "in": "query",
              "name": "pageSize",
              "schema": {
                "type": "integer",
                "minimum": 1,
                "maximum": 100,
                "default": 20
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Customer orders with pagination, newest first with order ID as tie breaker",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "properties": {
                            "order_id": {
                              "type": "integer"
                            },
                            "customer_id": {
                              "type": "integer"
                            },
                            "customer_name": {
                              "type": "string",
                              "nullable": true
                            },
                            "customer_email": {
                              "type": "string",
                              "nullable": true
                            },
                            "package_name": {
                              "type": "string",
                              "nullable": true
                            },
                            "mushroom_name": {
                              "type": "string",
                              "nullable": true
                            },
                            "quantity": {
                              "type": "integer",
                              "nullable": true,
                              "description": "Sum of item quantities"
                            },
                            "total_price": {
                              "type": "string",
                              "nullable": true
                            },
                            "subtotal": {
                              "type": "string"
                            },
                            "discount": {
                              "type": "string"
                            },
                            "shipping_fee": {
                              "type": "string"
                            },
                            "total_amount": {
                              "type": "string"
                            },
                            "status": {
                              "type": "string"
                            },
                            "payment_status": {
                              "type": "string"
                            },
                            "created_at": {
                              "type": "string",
                              "format": "date-time"
                            },
                            "updated_at": {
                              "type": "string",
                              "format": "date-time"
                            }
                          }
                        }
                      },
                      "pagination": {
                        "type": "object",
                        "properties": {
                          "page": {
                            "type": "integer"
                          },
                          "pageSize": {
                            "type": "integer"
                          },
                          "total": {
                            "type": "integer"
                          },
                          "totalPages": {
                            "type": "integer"
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid pagination"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Admin or Farm Operator role required"
            }
          }
        }
      },
      "/api/orders/{orderId}/cancel": {
        "patch": {
          "tags": [
            "Orders"
          ],
          "summary": "Cancel a pending order belonging to the authenticated customer",
          "description": "Cancellation is allowed only while the order is pending and its payment status is unpaid, pending, or failed. Pending payments are cancelled and the order payment status becomes failed.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "orderId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Order cancelled successfully"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "404": {
              "description": "Order not found for this customer"
            },
            "409": {
              "description": "Order is not eligible for cancellation"
            }
          }
        }
      },
      "/api/orders/{orderId}/harvest-history": {
        "get": {
          "tags": [
            "Harvests"
          ],
          "summary": "Trace cultivation sessions, mushroom types, harvests, yield, and receiving method for an order",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "orderId",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Order harvest history"
            },
            "400": {
              "description": "Invalid order ID"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Admin or Farm Operator role required"
            },
            "404": {
              "description": "Order not found"
            }
          }
        }
      },
      "/api/orders/{orderId}": {
        "get": {
          "tags": [
            "Orders"
          ],
          "summary": "Get details of an order belonging to the authenticated customer",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "orderId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Order details including its items"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "404": {
              "description": "Order not found for this customer"
            }
          }
        }
      },
      "/api/orders/cultivation": {
        "post": {
          "tags": [
            "Orders"
          ],
          "summary": "Create a cultivation order for a mushroom type, package, and tray quantity",
          "description": "The selected active package must cover the selected active mushroom's growing days. One ACTIVE floor with an approved matching mushroom profile must have enough AVAILABLE trays with ACTIVE positions in the same floor and room, after unexpired HELD reservations. Capacity is never combined across floors. Each tray requires three spawn units. Reservations are consumed after successful payment; Farm Operator selects physical trays later in WF-03.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateCultivationOrderRequest"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Order and cultivation order item created"
            },
            "400": {
              "description": "Invalid selection or mushroom growing time exceeds the selected package duration"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "404": {
              "description": "Package or mushroom type not found"
            },
            "409": {
              "description": "Insufficient cultivation capacity (`INSUFFICIENT_TRAYS` or `INSUFFICIENT_SPAWN`)"
            }
          }
        }
      },
      "/api/notifications": {
        "get": {
          "tags": [
            "Notifications"
          ],
          "summary": "List the current user's notifications",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "isRead",
              "schema": {
                "type": "boolean"
              }
            },
            {
              "in": "query",
              "name": "page",
              "schema": {
                "type": "integer",
                "minimum": 1,
                "default": 1
              }
            },
            {
              "in": "query",
              "name": "pageSize",
              "schema": {
                "type": "integer",
                "minimum": 1,
                "maximum": 100,
                "default": 20
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Notifications and unread count",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "array",
                        "items": {
                          "$ref": "#/components/schemas/Notification"
                        }
                      },
                      "pagination": {
                        "type": "object",
                        "properties": {
                          "page": {
                            "type": "integer"
                          },
                          "pageSize": {
                            "type": "integer"
                          },
                          "total": {
                            "type": "integer"
                          },
                          "totalPages": {
                            "type": "integer"
                          }
                        }
                      },
                      "meta": {
                        "type": "object",
                        "properties": {
                          "unread_count": {
                            "type": "integer",
                            "minimum": 0
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid isRead, page, or pageSize"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            }
          }
        }
      },
      "/api/notifications/read-all": {
        "patch": {
          "tags": [
            "Notifications"
          ],
          "summary": "Mark all current-user notifications as read",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "responses": {
            "200": {
              "description": "Notifications marked as read",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "object",
                        "properties": {
                          "updated": {
                            "type": "integer",
                            "minimum": 0
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            "401": {
              "description": "Missing or invalid JWT token"
            }
          }
        }
      },
      "/api/notifications/{notificationId}/read": {
        "patch": {
          "tags": [
            "Notifications"
          ],
          "summary": "Mark one current-user notification as read",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "notificationId",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Notification marked as read"
            },
            "400": {
              "description": "Invalid notification ID"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "404": {
              "description": "Notification not found"
            }
          }
        }
      },
      "/api/mushroom-types": {
        "get": {
          "tags": [
            "Mushroom Types"
          ],
          "summary": "Get all mushroom types",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "status",
              "schema": {
                "type": "string",
                "enum": [
                  "ACTIVE",
                  "INACTIVE"
                ]
              },
              "description": "Filter by status"
            }
          ],
          "responses": {
            "200": {
              "description": "List of mushroom types",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "array",
                        "items": {
                          "$ref": "#/components/schemas/MushroomType"
                        }
                      }
                    }
                  }
                }
              }
            },
            "401": {
              "description": "Missing or invalid JWT token"
            }
          }
        },
        "post": {
          "tags": [
            "Mushroom Types"
          ],
          "summary": "Create a new mushroom type with optional image upload",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "multipart/form-data": {
                "schema": {
                  "type": "object",
                  "required": [
                    "name",
                    "growingDays",
                    "price"
                  ],
                  "properties": {
                    "name": {
                      "type": "string",
                      "example": "King Oyster"
                    },
                    "description": {
                      "type": "string",
                      "example": "Mushroom type for soups and hotpot"
                    },
                    "growingDays": {
                      "type": "integer",
                      "example": 25
                    },
                    "price": {
                      "type": "number",
                      "example": 120000
                    },
                    "status": {
                      "type": "string",
                      "enum": [
                        "ACTIVE",
                        "INACTIVE"
                      ],
                      "example": "ACTIVE"
                    },
                    "image": {
                      "type": "string",
                      "format": "binary"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Mushroom type created successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "message": {
                        "type": "string"
                      },
                      "data": {
                        "$ref": "#/components/schemas/MushroomType"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Validation failed"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "409": {
              "description": "Mushroom type name already exists"
            }
          }
        }
      },
      "/api/mushroom-types/{id}": {
        "get": {
          "tags": [
            "Mushroom Types"
          ],
          "summary": "Get a mushroom type by id",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Mushroom type id"
            }
          ],
          "responses": {
            "200": {
              "description": "Mushroom type detail",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "$ref": "#/components/schemas/MushroomType"
                      }
                    }
                  }
                }
              }
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "404": {
              "description": "Mushroom type not found"
            }
          }
        },
        "put": {
          "tags": [
            "Mushroom Types"
          ],
          "summary": "Update a mushroom type with optional image upload",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "multipart/form-data": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string",
                      "example": "King Oyster Premium"
                    },
                    "description": {
                      "type": "string",
                      "example": "Updated description"
                    },
                    "growingDays": {
                      "type": "integer",
                      "example": 30
                    },
                    "price": {
                      "type": "number",
                      "example": 150000
                    },
                    "status": {
                      "type": "string",
                      "enum": [
                        "ACTIVE",
                        "INACTIVE"
                      ],
                      "example": "INACTIVE"
                    },
                    "image": {
                      "type": "string",
                      "format": "binary"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Mushroom type updated successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "message": {
                        "type": "string"
                      },
                      "data": {
                        "$ref": "#/components/schemas/MushroomType"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Validation failed"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "404": {
              "description": "Mushroom type not found"
            }
          }
        },
        "delete": {
          "tags": [
            "Mushroom Types"
          ],
          "summary": "Delete a mushroom type",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Mushroom type deleted successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "message": {
                        "type": "string"
                      },
                      "data": {
                        "$ref": "#/components/schemas/MushroomType"
                      }
                    }
                  }
                }
              }
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "404": {
              "description": "Mushroom type not found"
            }
          }
        }
      },
      "/api/mushroom-conditions": {
        "get": {
          "tags": [
            "Mushroom Conditions"
          ],
          "summary": "Get all mushroom conditions",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "mushroomTypeId",
              "schema": {
                "type": "integer"
              },
              "description": "Filter by mushroom type id"
            }
          ],
          "responses": {
            "200": {
              "description": "List of mushroom conditions",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "array",
                        "items": {
                          "$ref": "#/components/schemas/MushroomCondition"
                        }
                      }
                    }
                  }
                }
              }
            },
            "401": {
              "description": "Missing or invalid JWT token"
            }
          }
        },
        "post": {
          "tags": [
            "Mushroom Conditions"
          ],
          "summary": "Create a mushroom condition for a mushroom type",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateMushroomConditionRequest"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Mushroom condition created successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "message": {
                        "type": "string"
                      },
                      "data": {
                        "$ref": "#/components/schemas/MushroomCondition"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Validation failed"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "404": {
              "description": "Mushroom type not found"
            },
            "409": {
              "description": "This mushroom type already has a condition. Each mushroom type can only have one condition.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  },
                  "example": {
                    "message": "Nấm này đã có condition rồi"
                  }
                }
              }
            }
          }
        }
      },
      "/api/mushroom-conditions/{id}": {
        "get": {
          "tags": [
            "Mushroom Conditions"
          ],
          "summary": "Get a mushroom condition by id",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Mushroom condition detail",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "$ref": "#/components/schemas/MushroomCondition"
                      }
                    }
                  }
                }
              }
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "404": {
              "description": "Mushroom condition not found"
            }
          }
        },
        "put": {
          "tags": [
            "Mushroom Conditions"
          ],
          "summary": "Update a mushroom condition",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UpdateMushroomConditionRequest"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Mushroom condition updated successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "message": {
                        "type": "string"
                      },
                      "data": {
                        "$ref": "#/components/schemas/MushroomCondition"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Validation failed"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "404": {
              "description": "Mushroom condition not found"
            },
            "409": {
              "description": "Cannot assign this condition to a mushroom type that already has a condition.",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  },
                  "example": {
                    "message": "Nấm này đã có condition rồi"
                  }
                }
              }
            }
          }
        },
        "delete": {
          "tags": [
            "Mushroom Conditions"
          ],
          "summary": "Delete a mushroom condition",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Mushroom condition deleted successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "message": {
                        "type": "string"
                      },
                      "data": {
                        "$ref": "#/components/schemas/MushroomCondition"
                      }
                    }
                  }
                }
              }
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "404": {
              "description": "Mushroom condition not found"
            }
          }
        }
      },
      "/api/harvest-requests": {
        "post": {
          "tags": [
            "Harvest Requests"
          ],
          "summary": "Choose a receiving method for a harvest-ready cultivation session",
          "description": "Select PICKUP or DELIVERY from Examples. Replace sessionId with your own harvest-ready session ID. PICKUP requires scheduledAt; DELIVERY does not. customerNote is optional. Schedule examples use Vietnam time (UTC+07:00); adjust the date and time before testing.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "sessionId",
                    "harvestMethod"
                  ],
                  "properties": {
                    "sessionId": {
                      "type": "integer",
                      "minimum": 1,
                      "description": "Your harvest-ready cultivation session ID"
                    },
                    "harvestMethod": {
                      "type": "string",
                      "enum": [
                        "PICKUP",
                        "DELIVERY"
                      ],
                      "description": "PICKUP for customer self-harvest at the farm; DELIVERY for external delivery arranged by staff"
                    },
                    "scheduledAt": {
                      "type": "string",
                      "format": "date-time",
                      "description": "Required for PICKUP; optional for DELIVERY"
                    },
                    "customerNote": {
                      "type": "string",
                      "maxLength": 2000,
                      "description": "Optional receiving instructions"
                    }
                  }
                },
                "examples": {
                  "PICKUP": {
                    "summary": "PICKUP",
                    "value": {
                      "sessionId": 15,
                      "harvestMethod": "PICKUP",
                      "scheduledAt": "2026-11-05T09:00:00+07:00",
                      "customerNote": "I will collect the mushrooms at the farm at the scheduled time."
                    }
                  },
                  "DELIVERY": {
                    "summary": "DELIVERY",
                    "value": {
                      "sessionId": 15,
                      "harvestMethod": "DELIVERY",
                      "customerNote": "Please contact me before delivery."
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Receiving request created"
            },
            "400": {
              "description": "Invalid request or missing pickup schedule"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Request does not belong to the customer"
            },
            "404": {
              "description": "Cultivation session not found"
            },
            "409": {
              "description": "Session is not ready or already has a receiving request"
            }
          }
        }
      },
      "/api/harvest-requests/{id}": {
        "patch": {
          "tags": [
            "Harvest Requests"
          ],
          "summary": "Update receiving method or pickup schedule",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "harvestMethod"
                  ],
                  "properties": {
                    "harvestMethod": {
                      "type": "string",
                      "enum": [
                        "PICKUP",
                        "DELIVERY"
                      ]
                    },
                    "scheduledAt": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "customerNote": {
                      "type": "string",
                      "maxLength": 2000
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Receiving request updated"
            },
            "400": {
              "description": "Invalid receiving method or pickup schedule"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Request does not belong to the customer"
            },
            "404": {
              "description": "Harvest request not found"
            },
            "409": {
              "description": "Request is completed or the session is no longer eligible"
            }
          }
        }
      },
      "/api/harvest-requests/{id}/complete": {
        "post": {
          "tags": [
            "Harvest Requests"
          ],
          "summary": "Complete receiving or handover after harvest completion",
          "description": "Requires a completed harvest. PICKUP may be confirmed by the owning customer or farm staff; DELIVERY must be confirmed by farm staff after the external delivery is completed. No shipment record is required. Records confirmed_by and confirmation time, completes the session, and places its trays in MAINTENANCE awaiting WF-05 sanitation.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Receiving completed"
            },
            "400": {
              "description": "Invalid harvest request ID"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Request does not belong to the customer"
            },
            "404": {
              "description": "Harvest request not found"
            },
            "409": {
              "description": "Harvest or pickup schedule is incomplete",
              "or session is not HARVESTING": null
            }
          }
        }
      },
      "/api/harvests": {
        "post": {
          "tags": [
            "Harvests"
          ],
          "summary": "Create the one planned harvest for a harvest-ready cultivation session",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "sessionId"
                  ],
                  "properties": {
                    "sessionId": {
                      "type": "integer",
                      "minimum": 1,
                      "example": 15
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Planned harvest created"
            },
            "400": {
              "description": "Invalid session ID"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Admin or Farm Operator role required"
            },
            "404": {
              "description": "Cultivation session not found"
            },
            "409": {
              "description": "Session is not harvest ready or already has a harvest"
            }
          }
        }
      },
      "/api/harvests/admin": {
        "get": {
          "tags": [
            "Harvests"
          ],
          "summary": "List harvests for Admin and Farm Operators",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "status",
              "schema": {
                "type": "string",
                "enum": [
                  "PLANNED",
                  "IN_PROGRESS",
                  "COMPLETED",
                  "CANCELLED"
                ]
              }
            },
            {
              "in": "query",
              "name": "mushroomTypeId",
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            },
            {
              "in": "query",
              "name": "fromDate",
              "schema": {
                "type": "string",
                "format": "date"
              }
            },
            {
              "in": "query",
              "name": "toDate",
              "schema": {
                "type": "string",
                "format": "date"
              }
            },
            {
              "in": "query",
              "name": "orderId",
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Harvest list with order",
              "customer": null,
              "mushroom": null,
              "yield": null,
              "and receiving method": null
            },
            "400": {
              "description": "Invalid filter"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Admin or Farm Operator role required"
            }
          }
        }
      },
      "/api/harvests/{id}/start": {
        "post": {
          "tags": [
            "Harvests"
          ],
          "summary": "Start a planned harvest and move its session into HARVESTING",
          "description": "Requires a customer receiving method, a schedule for PICKUP, and no unresolved quality or HIGH-severity incidents. PICKUP means customer self-harvest at the farm; DELIVERY means staff harvest followed by delivery arranged outside this system.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Harvest started"
            },
            "400": {
              "description": "Invalid harvest ID"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Admin or Farm Operator role required"
            },
            "404": {
              "description": "Harvest not found"
            },
            "409": {
              "description": "Invalid harvest or cultivation-session transition"
            }
          }
        }
      },
      "/api/harvests/{id}/yield": {
        "post": {
          "tags": [
            "Harvests"
          ],
          "summary": "Record the actual yield of an in-progress harvest",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "totalWeightKg",
                    "usableWeightKg",
                    "rejectedWeightKg"
                  ],
                  "properties": {
                    "totalWeightKg": {
                      "type": "number",
                      "minimum": 0,
                      "example": 5.2
                    },
                    "usableWeightKg": {
                      "type": "number",
                      "minimum": 0,
                      "example": 4.8
                    },
                    "rejectedWeightKg": {
                      "type": "number",
                      "minimum": 0,
                      "example": 0.4
                    },
                    "qualityGrade": {
                      "type": "string",
                      "maxLength": 20,
                      "example": "A"
                    },
                    "notes": {
                      "type": "string",
                      "maxLength": 2000
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Actual yield recorded"
            },
            "400": {
              "description": "Invalid weight or classified weights do not equal total weight"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Admin or Farm Operator role required"
            },
            "404": {
              "description": "Harvest not found"
            },
            "409": {
              "description": "Harvest is not in progress"
            }
          }
        }
      },
      "/api/harvests/{id}/complete": {
        "post": {
          "tags": [
            "Harvests"
          ],
          "summary": "Complete an in-progress harvest after yield is recorded",
          "description": "Completes only the harvest. The session stays HARVESTING until handover is confirmed through the harvest request complete API.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Harvest completed; customer handover is still required"
            },
            "400": {
              "description": "Invalid harvest ID"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Admin or Farm Operator role required"
            },
            "404": {
              "description": "Harvest not found"
            },
            "409": {
              "description": "Yield is missing or the harvest cannot transition to completed"
            }
          }
        }
      },
      "/api/harvests/{id}": {
        "get": {
          "tags": [
            "Harvests"
          ],
          "summary": "Get harvest detail with order, session, mushroom, yield, and receiving data",
          "description": "Includes harvest_method (PICKUP for customer self-harvest at the farm or DELIVERY for external delivery), scheduled_at, customer_note, harvest_request_status, confirmed_by, confirmed_at, and completed_at.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Harvest detail"
            },
            "400": {
              "description": "Invalid harvest ID"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Admin or Farm Operator role required"
            },
            "404": {
              "description": "Harvest not found"
            }
          }
        }
      },
      "/api/farm/sessions": {
        "get": {
          "tags": [
            "Farm Spawn Workflow"
          ],
          "summary": "List paid sessions in the farm cultivation workflow",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "status",
              "schema": {
                "type": "string",
                "enum": [
                  "PENDING",
                  "SPAWN_RESTING",
                  "MYCELIAL_DEVELOPMENT",
                  "READY_FOR_CULTIVATION",
                  "CULTIVATING",
                  "HARVEST_READY",
                  "HARVESTING",
                  "COMPLETED",
                  "CANCELLED"
                ]
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Sessions with spawn and tray quantities"
            },
            "403": {
              "description": "Admin or Farm Operator role required"
            }
          }
        }
      },
      "/api/farm/sessions/{id}/spawn-inspections": {
        "post": {
          "tags": [
            "Farm Spawn Workflow"
          ],
          "summary": "Record spawn inspection and optional actual replacement",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "totalChecked",
                    "normalQuantity",
                    "warningQuantity",
                    "abnormalQuantity",
                    "condition"
                  ],
                  "properties": {
                    "totalChecked": {
                      "type": "integer",
                      "minimum": 1
                    },
                    "normalQuantity": {
                      "type": "integer",
                      "minimum": 0
                    },
                    "warningQuantity": {
                      "type": "integer",
                      "minimum": 0
                    },
                    "abnormalQuantity": {
                      "type": "integer",
                      "minimum": 0
                    },
                    "condition": {
                      "type": "string",
                      "enum": [
                        "NORMAL",
                        "WARNING",
                        "ABNORMAL"
                      ]
                    },
                    "replacementQuantity": {
                      "type": "integer",
                      "minimum": 0
                    },
                    "notes": {
                      "type": "string"
                    },
                    "nextCheckAt": {
                      "type": "string",
                      "format": "date-time"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Inspection saved; replacement stock is deducted transactionally"
            },
            "409": {
              "description": "Session is not in an inspectable stage or replacement stock is insufficient"
            }
          }
        },
        "get": {
          "tags": [
            "Farm Spawn Workflow"
          ],
          "summary": "View spawn inspection history for a session",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Inspection history, including uploaded image metadata"
            },
            "404": {
              "description": "Session not found"
            }
          }
        }
      },
      "/api/farm/spawn-inspections/{id}/images": {
        "post": {
          "tags": [
            "Farm Spawn Workflow"
          ],
          "summary": "Upload an inspection image to Cloudinary",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "multipart/form-data": {
                "schema": {
                  "type": "object",
                  "required": [
                    "image"
                  ],
                  "properties": {
                    "image": {
                      "type": "string",
                      "format": "binary"
                    },
                    "caption": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Uploaded image linked to the spawn inspection"
            },
            "404": {
              "description": "Inspection not found"
            }
          }
        }
      },
      "/api/farm/spawn-inspections/{id}/replacements": {
        "post": {
          "tags": [
            "Farm Spawn Workflow"
          ],
          "summary": "Issue replacement spawn for abnormal units already recorded",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "replacementQuantity"
                  ],
                  "properties": {
                    "replacementQuantity": {
                      "type": "integer",
                      "minimum": 1
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Stock deducted and inventory transaction recorded"
            },
            "409": {
              "description": "Insufficient stock or inspection is no longer in its current stage"
            }
          }
        }
      },
      "/api/farm/sessions/{id}/stage": {
        "patch": {
          "tags": [
            "Farm Spawn Workflow"
          ],
          "summary": "Start the combined resting/incubation phase or mark spawn ready for cultivation",
          "description": "Resting and mycelial development happen together. From PENDING choose SPAWN_RESTING or MYCELIAL_DEVELOPMENT (existing equivalent phase values). Either can move directly to READY_FOR_CULTIVATION after the latest spawn inspection is NORMAL and covers all spawn units. Payment and stock issuance are required. No sequential resting-to-incubation transition is needed.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "stage"
                  ],
                  "properties": {
                    "stage": {
                      "type": "string",
                      "enum": [
                        "SPAWN_RESTING",
                        "MYCELIAL_DEVELOPMENT",
                        "READY_FOR_CULTIVATION"
                      ]
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Spawn phase updated successfully"
            },
            "400": {
              "description": "Invalid stage or session ID"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Admin or Farm Operator role required"
            },
            "404": {
              "description": "Session not found"
            },
            "409": {
              "description": "Stage transition requirements are not met"
            }
          }
        }
      },
      "/api/issues": {
        "post": {
          "tags": [
            "Disease Management"
          ],
          "summary": "Create a spawn- or tray-based cultivation issue",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "issueType",
                    "title",
                    "description"
                  ],
                  "properties": {
                    "sessionTrayId": {
                      "type": "integer",
                      "description": "Required for tray issues"
                    },
                    "inspectionId": {
                      "type": "integer",
                      "description": "Optional tray inspection"
                    },
                    "spawnInspectionId": {
                      "type": "integer",
                      "description": "Required for spawn issues"
                    },
                    "issueType": {
                      "type": "string"
                    },
                    "title": {
                      "type": "string"
                    },
                    "description": {
                      "type": "string"
                    },
                    "severity": {
                      "type": "string",
                      "enum": [
                        "LOW",
                        "MEDIUM",
                        "HIGH"
                      ]
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Issue created; stage and sensor context are included in the response but not persisted"
            },
            "400": {
              "description": "Invalid issue source or payload"
            },
            "403": {
              "description": "Farm Operator or Admin role required"
            },
            "404": {
              "description": "Source inspection not found"
            },
            "409": {
              "description": "Session is not in the relevant cultivation stage"
            }
          }
        },
        "get": {
          "tags": [
            "Disease Management"
          ],
          "summary": "List issues with status, severity, and session filters",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "status",
              "schema": {
                "type": "string",
                "enum": [
                  "OPEN",
                  "WAITING_EXPERT",
                  "IN_PROGRESS",
                  "MONITORING",
                  "RESOLVED"
                ]
              }
            },
            {
              "in": "query",
              "name": "severity",
              "schema": {
                "type": "string",
                "enum": [
                  "LOW",
                  "MEDIUM",
                  "HIGH"
                ]
              }
            },
            {
              "in": "query",
              "name": "sessionId",
              "schema": {
                "type": "integer"
              }
            },
            {
              "in": "query",
              "name": "page",
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            },
            {
              "in": "query",
              "name": "pageSize",
              "schema": {
                "type": "integer",
                "minimum": 1,
                "maximum": 100
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Paginated issue list"
            },
            "403": {
              "description": "Staff role required"
            }
          }
        }
      },
      "/api/issues/{issueId}": {
        "get": {
          "tags": [
            "Disease Management"
          ],
          "summary": "Get issue details and evidence media",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "issueId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Issue details"
            },
            "404": {
              "description": "Issue not found"
            }
          }
        }
      },
      "/api/issues/{issueId}/status": {
        "patch": {
          "tags": [
            "Disease Management"
          ],
          "summary": "Change issue status using an allowed workflow transition",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "issueId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "status"
                  ],
                  "properties": {
                    "status": {
                      "type": "string",
                      "enum": [
                        "IN_PROGRESS",
                        "MONITORING"
                      ]
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Issue status updated using statuses supported by the current database"
            },
            "409": {
              "description": "Invalid workflow transition or missing treatment result"
            }
          }
        }
      },
      "/api/issues/{issueId}/resolve": {
        "patch": {
          "tags": [
            "Disease Management"
          ],
          "summary": "Resolve an issue after expert review",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "issueId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Issue resolved"
            },
            "403": {
              "description": "Assigned expert or Admin role required"
            },
            "409": {
              "description": "Issue is not in MONITORING status"
            }
          }
        }
      },
      "/api/issues/{issueId}/media": {
        "post": {
          "tags": [
            "Disease Management"
          ],
          "summary": "Upload an issue image to its linked inspection image history",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "issueId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "multipart/form-data": {
                "schema": {
                  "type": "object",
                  "required": [
                    "file"
                  ],
                  "properties": {
                    "file": {
                      "type": "string",
                      "format": "binary"
                    },
                    "caption": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Image added to the linked inspection image history"
            },
            "400": {
              "description": "Only images are supported by the current issue-image tables"
            },
            "409": {
              "description": "Issue has no linked inspection or evidence is locked"
            }
          }
        }
      },
      "/api/issues/{issueId}/consultations": {
        "post": {
          "tags": [
            "Disease Management"
          ],
          "summary": "Request expert consultation for an issue",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "issueId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "question"
                  ],
                  "properties": {
                    "question": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Consultation created and experts notified"
            },
            "409": {
              "description": "Issue already has an active consultation"
            }
          }
        }
      },
      "/api/consultations": {
        "get": {
          "tags": [
            "Disease Management"
          ],
          "summary": "List consultations for experts",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "status",
              "schema": {
                "type": "string",
                "enum": [
                  "PENDING",
                  "IN_PROGRESS",
                  "ANSWERED",
                  "CLOSED"
                ]
              }
            },
            {
              "in": "query",
              "name": "page",
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            },
            {
              "in": "query",
              "name": "pageSize",
              "schema": {
                "type": "integer",
                "minimum": 1,
                "maximum": 100
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Paginated consultation list"
            },
            "403": {
              "description": "Expert or Admin role required"
            }
          }
        }
      },
      "/api/consultations/{consultationId}": {
        "get": {
          "tags": [
            "Disease Management"
          ],
          "summary": "Get consultation, treatment, and question follow-up history",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "consultationId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Consultation details"
            },
            "404": {
              "description": "Consultation not found"
            }
          }
        }
      },
      "/api/consultations/{consultationId}/assign": {
        "patch": {
          "tags": [
            "Disease Management"
          ],
          "summary": "Accept a consultation or assign an expert as Admin",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "consultationId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "expertId": {
                      "type": "integer",
                      "description": "Required for Admin assignment"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Consultation assigned"
            },
            "400": {
              "description": "Selected account is not an expert"
            }
          }
        }
      },
      "/api/consultations/{consultationId}/respond": {
        "patch": {
          "tags": [
            "Disease Management"
          ],
          "summary": "Submit diagnosis and solution or request more information",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "consultationId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "diagnosis"
                  ],
                  "properties": {
                    "diagnosis": {
                      "type": "string"
                    },
                    "solution": {
                      "type": "string"
                    },
                    "needsMoreInfo": {
                      "type": "boolean"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Expert response submitted; request-more-info maps to PENDING consultation and WAITING_EXPERT issue"
            },
            "403": {
              "description": "Assigned expert or Admin role required"
            }
          }
        }
      },
      "/api/consultations/{consultationId}/close": {
        "patch": {
          "tags": [
            "Disease Management"
          ],
          "summary": "Close a responded consultation",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "consultationId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Consultation closed"
            }
          }
        }
      },
      "/api/consultations/{consultationId}/messages": {
        "post": {
          "tags": [
            "Disease Management"
          ],
          "summary": "Append follow-up information to the consultation question",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "consultationId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "message"
                  ],
                  "properties": {
                    "message": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Follow-up appended to the consultation question and returned to the assigned expert; no separate message table is used"
            }
          }
        }
      },
      "/api/consultations/{consultationId}/treatments": {
        "post": {
          "tags": [
            "Disease Management"
          ],
          "summary": "Record an operator treatment action and outcome",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "consultationId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "actionDescription"
                  ],
                  "properties": {
                    "actionDescription": {
                      "type": "string"
                    },
                    "resultDescription": {
                      "type": "string"
                    },
                    "performedAt": {
                      "type": "string",
                      "format": "date-time"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Treatment recorded"
            },
            "409": {
              "description": "Expert solution is not available"
            }
          }
        },
        "get": {
          "tags": [
            "Disease Management"
          ],
          "summary": "List treatments and attached media for a consultation",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "consultationId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Treatment history"
            }
          }
        }
      },
      "/api/treatments/{treatmentLogId}/media": {
        "post": {
          "tags": [
            "Disease Management"
          ],
          "summary": "Upload treatment evidence to Cloudinary and save its URL",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "treatmentLogId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "multipart/form-data": {
                "schema": {
                  "type": "object",
                  "required": [
                    "file",
                    "mediaStage"
                  ],
                  "properties": {
                    "file": {
                      "type": "string",
                      "format": "binary"
                    },
                    "mediaStage": {
                      "type": "string",
                      "enum": [
                        "BEFORE",
                        "DURING",
                        "AFTER"
                      ]
                    },
                    "caption": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Media uploaded"
            }
          }
        }
      },
      "/api/treatments/{treatmentLogId}/media/{mediaId}": {
        "delete": {
          "tags": [
            "Disease Management"
          ],
          "summary": "Delete treatment media before issue review locks it",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "treatmentLogId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            },
            {
              "in": "path",
              "name": "mediaId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Media deleted from Cloudinary and database using its stored URL"
            },
            "409": {
              "description": "Media is locked or stored URL is not a Cloudinary URL"
            }
          }
        }
      },
      "/api/customer/sessions/{sessionId}/issues": {
        "get": {
          "tags": [
            "Disease Management"
          ],
          "summary": "List issues for a session owned by the authenticated customer",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "sessionId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Session issue list"
            },
            "404": {
              "description": "Session not found or not owned by customer"
            }
          }
        }
      },
      "/api/customer/issues/{issueId}": {
        "get": {
          "tags": [
            "Disease Management"
          ],
          "summary": "Get an issue owned by the authenticated customer",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "issueId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Customer-visible issue"
            },
            "404": {
              "description": "Issue not found or not owned by customer"
            }
          }
        }
      },
      "/api/customer/issues/{issueId}/timeline": {
        "get": {
          "tags": [
            "Disease Management"
          ],
          "summary": "Get customer-visible issue, consultation, treatment, follow-up, and media timeline",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "issueId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Issue timeline"
            },
            "404": {
              "description": "Issue not found or not owned by customer"
            }
          }
        }
      },
      "/api/customer/orders/{orderId}/cultivation-status": {
        "get": {
          "tags": [
            "Farm Spawn Workflow"
          ],
          "summary": "View cultivation sessions for an owned order, or any order as an admin",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "orderId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Customer-visible session status, harvest readiness, latest growth progress, and assigned trays"
            },
            "404": {
              "description": "Order not found or not accessible to this user"
            }
          }
        }
      },
      "/api/customer/orders/{orderId}/cultivation-progress": {
        "get": {
          "tags": [
            "Farm Spawn Workflow"
          ],
          "summary": "View cultivation stage history for an owned order, or any order as an admin",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "orderId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Stage timeline"
            },
            "404": {
              "description": "Order not found or not accessible to this user"
            }
          }
        }
      },
      "/api/customer/orders/{orderId}/spawn-inspections": {
        "get": {
          "tags": [
            "Farm Spawn Workflow"
          ],
          "summary": "View spawn inspection history for an owned order, or any order as an admin",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "orderId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Inspection history and image URLs"
            },
            "404": {
              "description": "Order not found or not accessible to this user"
            }
          }
        }
      },
      "/api/customer/orders/{orderId}/spawn-inspections/{inspectionId}": {
        "get": {
          "tags": [
            "Farm Spawn Workflow"
          ],
          "summary": "View one spawn inspection for an owned order, or any order as an admin",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "orderId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            },
            {
              "in": "path",
              "name": "inspectionId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Inspection details and image URLs"
            },
            "404": {
              "description": "Inspection not found for this order or not accessible to this user"
            }
          }
        }
      },
      "/api/cultivation-trays": {
        "get": {
          "tags": [
            "Cultivation Trays"
          ],
          "summary": "List cultivation trays",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "roomId",
              "schema": {
                "type": "integer"
              }
            },
            {
              "in": "query",
              "name": "floorId",
              "schema": {
                "type": "integer"
              }
            },
            {
              "in": "query",
              "name": "status",
              "schema": {
                "type": "string",
                "enum": [
                  "AVAILABLE",
                  "OCCUPIED",
                  "MAINTENANCE",
                  "INACTIVE"
                ]
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Cultivation tray list"
            }
          }
        },
        "post": {
          "tags": [
            "Cultivation Trays"
          ],
          "summary": "Create a cultivation tray",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateCultivationTrayRequest"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Cultivation tray created successfully"
            },
            "404": {
              "description": "Cultivation room not found"
            },
            "409": {
              "description": "Tray code already exists"
            }
          }
        }
      },
      "/api/cultivation-trays/{id}": {
        "get": {
          "tags": [
            "Cultivation Trays"
          ],
          "summary": "Get a cultivation tray by id",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Cultivation tray detail"
            },
            "404": {
              "description": "Cultivation tray not found"
            }
          }
        },
        "put": {
          "tags": [
            "Cultivation Trays"
          ],
          "summary": "Update a cultivation tray",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UpdateCultivationTrayRequest"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Cultivation tray updated successfully"
            },
            "404": {
              "description": "Tray or room not found"
            }
          }
        },
        "delete": {
          "tags": [
            "Cultivation Trays"
          ],
          "summary": "Delete a cultivation tray",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Cultivation tray deleted successfully"
            },
            "409": {
              "description": "Tray is used by a cultivation session"
            }
          }
        }
      },
      "/api/cultivation-sessions/admin": {
        "get": {
          "tags": [
            "Cultivation Sessions"
          ],
          "summary": "List cultivation sessions for Admin and Farm Operator",
          "description": "Roles: 1 = Admin, 2 = Farm Operator, 3 = Customer. Only roles 1 and 2 may access. Returns data and pagination using the existing session filters.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "page",
              "schema": {
                "type": "integer",
                "minimum": 1,
                "default": 1
              }
            },
            {
              "in": "query",
              "name": "pageSize",
              "schema": {
                "type": "integer",
                "minimum": 1,
                "maximum": 100,
                "default": 20
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Cultivation session list with pagination"
            },
            "400": {
              "description": "Invalid filters or pagination"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Admin or Farm Operator role required"
            }
          }
        }
      },
      "/api/cultivation-sessions/admin/available-trays": {
        "get": {
          "tags": [
            "Cultivation Sessions"
          ],
          "summary": "List trays currently assignable to a qualified cultivation session",
          "description": "Returns AVAILABLE trays with ACTIVE positions in the same floor and room, on ACTIVE floors with no active cultivation-session assignment. Optionally filter by floorId. Read-only preview; assignment rechecks positions and availability under row locks.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "floorId",
              "schema": {
                "type": "integer",
                "minimum": 1
              },
              "description": "Optional active cultivation floor ID"
            }
          ],
          "responses": {
            "200": {
              "description": "Active-floor trays available for assignment",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "properties": {
                            "tray_id": {
                              "type": "integer",
                              "example": 21
                            },
                            "tray_code": {
                              "type": "string",
                              "example": "F2-TRAY-01"
                            },
                            "floor_id": {
                              "type": "integer",
                              "example": 2
                            },
                            "floor_name": {
                              "type": "string",
                              "example": "Floor 2"
                            },
                            "position_id": {
                              "type": "integer",
                              "example": 12
                            },
                            "row_number": {
                              "type": "integer",
                              "example": 1
                            },
                            "column_number": {
                              "type": "integer",
                              "example": 2
                            },
                            "status": {
                              "type": "string",
                              "example": "AVAILABLE"
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid floor ID"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Admin or Farm Operator role required"
            }
          }
        }
      },
      "/api/cultivation-sessions/admin/{sessionId}": {
        "get": {
          "tags": [
            "Cultivation Sessions"
          ],
          "summary": "Get a cultivation session with latest progress and assigned trays",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "sessionId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Session detail including status, harvest_status, harvest_ready, growth_status, progress_percent, condition, notes, mushroom, and trays with floor details"
            },
            "400": {
              "description": "Invalid session ID"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Admin or Farm Operator role required"
            },
            "404": {
              "description": "Session not found"
            }
          }
        }
      },
      "/api/cultivation-sessions/admin/{sessionId}/trays": {
        "post": {
          "tags": [
            "Cultivation Sessions"
          ],
          "summary": "Assign selected floor and trays to a ready cultivation session",
          "description": "Submit floorId and trayIds explicitly. The Farm Operator determines cultivation suitability. All selected trays must belong to the ACTIVE floor with ACTIVE positions in the same room. Atomic assignment requires READY_FOR_CULTIVATION and exactly tray_quantity trays. Success starts CULTIVATING with initial progress at 0 percent.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "sessionId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "floorId",
                    "trayIds"
                  ],
                  "properties": {
                    "floorId": {
                      "type": "integer",
                      "minimum": 1,
                      "example": 2
                    },
                    "trayIds": {
                      "type": "array",
                      "minItems": 1,
                      "uniqueItems": true,
                      "items": {
                        "type": "integer",
                        "minimum": 1
                      },
                      "example": [
                        21,
                        22,
                        25
                      ]
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Selected floor and trays assigned; session is CULTIVATING",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "message": {
                        "type": "string"
                      },
                      "data": {
                        "type": "object",
                        "properties": {
                          "session_id": {
                            "type": "integer",
                            "example": 9
                          },
                          "status": {
                            "type": "string",
                            "example": "CULTIVATING"
                          },
                          "floor": {
                            "type": "object",
                            "properties": {
                              "floor_id": {
                                "type": "integer",
                                "example": 2
                              },
                              "floor_name": {
                                "type": "string",
                                "example": "Floor 2"
                              }
                            }
                          },
                          "required_trays": {
                            "type": "integer",
                            "example": 3
                          },
                          "assigned_trays_count": {
                            "type": "integer",
                            "example": 3
                          },
                          "assigned_trays": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "session_tray_id": {
                                  "type": "integer",
                                  "example": 31
                                },
                                "tray_id": {
                                  "type": "integer",
                                  "example": 21
                                },
                                "tray_code": {
                                  "type": "string",
                                  "example": "F2-TRAY-01"
                                },
                                "status": {
                                  "type": "string",
                                  "example": "ACTIVE"
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid session ID",
              "floor ID": null,
              "or selected tray IDs": null
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Admin or Farm Operator role required"
            },
            "404": {
              "description": "Session",
              "floor": null,
              "or selected tray not found": null
            },
            "409": {
              "description": "INVALID_SESSION_STATUS, INVALID_TRAY_QUANTITY, FLOOR_NOT_ACTIVE, TRAY_FLOOR_MISMATCH, TRAY_UNAVAILABLE, TRAY_POSITION_UNAVAILABLE, or TRAYS_ALREADY_ASSIGNED"
            }
          }
        }
      },
      "/api/cultivation-sessions/admin/session-trays/{sessionTrayId}/inspections": {
        "post": {
          "tags": [
            "Cultivation Audit"
          ],
          "summary": "Record a daily tray inspection",
          "description": "Records tray observations only. Use the session progress API to update cultivation progress and lifecycle status.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "sessionTrayId",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "growthStage",
                    "growthProgress"
                  ],
                  "properties": {
                    "growthStage": {
                      "type": "string",
                      "enum": [
                        "FRUITING_INITIATION",
                        "PINNING",
                        "YOUNG_FRUITING",
                        "MATURATION"
                      ],
                      "example": "PINNING"
                    },
                    "growthProgress": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100,
                      "example": 60
                    },
                    "trayCondition": {
                      "type": "string"
                    },
                    "mushroomCondition": {
                      "type": "string"
                    },
                    "notes": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Tray inspection recorded"
            },
            "400": {
              "description": "Invalid stage or inspection input"
            },
            "404": {
              "description": "Session tray not found"
            },
            "409": {
              "description": "Session tray is not active"
            }
          }
        }
      },
      "/api/cultivation-sessions/admin/inspections/{inspectionId}/images": {
        "post": {
          "tags": [
            "Cultivation Audit"
          ],
          "summary": "Upload an image for a cultivation inspection",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "inspectionId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "multipart/form-data": {
                "schema": {
                  "type": "object",
                  "required": [
                    "image"
                  ],
                  "properties": {
                    "image": {
                      "type": "string",
                      "format": "binary"
                    },
                    "caption": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Inspection image uploaded"
            },
            "400": {
              "description": "Invalid image or request input"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Admin or Farm Operator role required"
            },
            "404": {
              "description": "Inspection not found"
            }
          }
        }
      },
      "/api/cultivation-sessions/admin/{sessionId}/incidents": {
        "post": {
          "tags": [
            "Cultivation Audit"
          ],
          "summary": "Record an immutable cultivation incident for an active session tray",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "sessionId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "sessionTrayId",
                    "incidentType"
                  ],
                  "properties": {
                    "sessionTrayId": {
                      "type": "integer"
                    },
                    "inspectionId": {
                      "type": "integer"
                    },
                    "incidentType": {
                      "type": "string",
                      "enum": [
                        "NO_PINNING",
                        "SLOW_GROWTH",
                        "DRY_SHRIVELED",
                        "MUSHY",
                        "DEFORMED_GROWTH",
                        "CONTAMINATION",
                        "DISEASE",
                        "DAMAGE",
                        "SENSOR_DATA_LOSS",
                        "DEVICE_FAILURE",
                        "DELAYED_MATURATION",
                        "QUALITY_FAILURE",
                        "OTHER"
                      ]
                    },
                    "severity": {
                      "type": "string",
                      "enum": [
                        "LOW",
                        "MEDIUM",
                        "HIGH"
                      ]
                    },
                    "description": {
                      "type": "string"
                    },
                    "actionTaken": {
                      "type": "string"
                    },
                    "nextAction": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        },
        "get": {
          "tags": [
            "Cultivation Audit"
          ],
          "summary": "List cultivation incident history for a session",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "sessionId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Incident history"
            },
            "400": {
              "description": "Invalid incident input or session ID"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Admin or Farm Operator role required"
            },
            "404": {
              "description": "Session not found"
            },
            "409": {
              "description": "Session is not in a valid incident-recording state"
            }
          }
        }
      },
      "/api/cultivation-sessions/admin/{sessionId}/growth": {
        "patch": {
          "tags": [
            "Cultivation Sessions"
          ],
          "summary": "Update current mushroom growth condition and progress",
          "description": "Select a growth status from Examples below, then click Try it out to send the request.\nExample percentages are testing and operational guidelines, not validation constraints between growthStatus and progressPercent.\nprogressPercent must be between 0 and 100 and cannot decrease from the previous update.\ngrowthStatus corresponds to the four WF-03 stages in order: FRUITING_INITIATION, PINNING, YOUNG_FRUITING, and MATURATION.\ncondition describes the observed condition, for example NORMAL. notes is optional. expectedHarvestDate optionally updates the forecast (YYYY-MM-DD), records it in history, and notifies the customer. New growth observations reset readiness and require a fresh assessment.\nMATURATION or 100% does not automatically set HARVEST_READY. Call PATCH /api/cultivation-sessions/admin/{sessionId}/harvest-readiness with harvestReady=true to confirm readiness separately.\n",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "sessionId",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "growthStatus",
                    "progressPercent",
                    "condition"
                  ],
                  "properties": {
                    "growthStatus": {
                      "type": "string",
                      "enum": [
                        "FRUITING_INITIATION",
                        "PINNING",
                        "YOUNG_FRUITING",
                        "MATURATION"
                      ],
                      "example": "FRUITING_INITIATION"
                    },
                    "progressPercent": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100,
                      "example": 10
                    },
                    "condition": {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 500,
                      "example": "NORMAL"
                    },
                    "notes": {
                      "type": "string",
                      "maxLength": 1000
                    },
                    "expectedHarvestDate": {
                      "type": "string",
                      "format": "date",
                      "example": "2026-11-10"
                    }
                  }
                },
                "examples": {
                  "FRUITING_INITIATION": {
                    "summary": "FRUITING_INITIATION",
                    "value": {
                      "growthStatus": "FRUITING_INITIATION",
                      "progressPercent": 10,
                      "condition": "NORMAL",
                      "notes": "Spawn has been placed on the assigned trays and fruiting initiation has started."
                    }
                  },
                  "PINNING": {
                    "summary": "PINNING",
                    "value": {
                      "growthStatus": "PINNING",
                      "progressPercent": 30,
                      "condition": "NORMAL",
                      "notes": "Initial mushroom pins are appearing normally."
                    }
                  },
                  "YOUNG_FRUITING": {
                    "summary": "YOUNG_FRUITING",
                    "value": {
                      "growthStatus": "YOUNG_FRUITING",
                      "progressPercent": 60,
                      "condition": "NORMAL",
                      "notes": "Young fruiting bodies are developing normally."
                    }
                  },
                  "MATURATION": {
                    "summary": "MATURATION",
                    "value": {
                      "growthStatus": "MATURATION",
                      "progressPercent": 90,
                      "condition": "NORMAL",
                      "notes": "Mushrooms are approaching the expected mature condition and should be evaluated for harvest readiness."
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Growth history recorded; session remains CULTIVATING"
            },
            "400": {
              "description": "Invalid input"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Admin or Farm Operator role required"
            },
            "404": {
              "description": "Session not found"
            },
            "409": {
              "description": "Invalid session state or growth regression"
            }
          }
        }
      },
      "/api/cultivation-sessions/admin/{sessionId}/harvest-readiness": {
        "patch": {
          "tags": [
            "Cultivation Sessions"
          ],
          "summary": "Confirm whether the cultivation session is ready for harvesting",
          "description": "Only CULTIVATING sessions with all required trays ACTIVE and OCCUPIED and a recorded growth condition can be assessed. True requires MATURATION and no unresolved quality or HIGH-severity incidents, and sets harvest_status to HARVEST_READY while status stays CULTIVATING. False sets NOT_READY. The confirming operator and time are recorded and the customer is notified when ready. The assessment and optional notes are appended to history. This API never performs harvesting.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "sessionId",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "harvestReady"
                  ],
                  "properties": {
                    "harvestReady": {
                      "type": "boolean",
                      "example": true
                    },
                    "notes": {
                      "type": "string",
                      "maxLength": 1000
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Harvest readiness assessment recorded"
            },
            "400": {
              "description": "Invalid input"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Admin or Farm Operator role required"
            },
            "404": {
              "description": "Session not found"
            },
            "409": {
              "description": "Invalid session state",
              "missing trays or growth condition": null,
              "or immature growth": null
            }
          }
        }
      },
      "/api/cultivation-sessions/admin/{sessionId}/progress": {
        "get": {
          "tags": [
            "Cultivation Audit"
          ],
          "summary": "Get immutable WF-03 progress history for a cultivation session",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "sessionId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Session status, harvest status, latest progress, and complete progress history"
            },
            "400": {
              "description": "Invalid session ID"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Admin or Farm Operator role required"
            },
            "404": {
              "description": "Session not found"
            }
          }
        }
      },
      "/api/cultivation-rooms": {
        "get": {
          "tags": [
            "Cultivation Rooms"
          ],
          "summary": "List cultivation rooms",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "status",
              "schema": {
                "type": "string",
                "enum": [
                  "ACTIVE",
                  "INACTIVE",
                  "MAINTENANCE"
                ]
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Cultivation room list"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            }
          }
        },
        "post": {
          "tags": [
            "Cultivation Rooms"
          ],
          "summary": "Create a cultivation room",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateCultivationRoomRequest"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Cultivation room created successfully"
            },
            "409": {
              "description": "Room code already exists"
            }
          }
        }
      },
      "/api/cultivation-rooms/{id}/trays": {
        "get": {
          "tags": [
            "Cultivation Trays"
          ],
          "summary": "List cultivation trays belonging to a room",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "description": "Cultivation room ID",
              "schema": {
                "type": "integer"
              }
            },
            {
              "in": "query",
              "name": "status",
              "schema": {
                "type": "string",
                "enum": [
                  "AVAILABLE",
                  "OCCUPIED",
                  "MAINTENANCE",
                  "INACTIVE"
                ]
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Trays belonging to the room"
            },
            "400": {
              "description": "Invalid room ID or status"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "404": {
              "description": "Cultivation room not found"
            }
          }
        }
      },
      "/api/cultivation-rooms/{id}": {
        "get": {
          "tags": [
            "Cultivation Rooms"
          ],
          "summary": "Get a cultivation room by id",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Cultivation room detail"
            },
            "404": {
              "description": "Cultivation room not found"
            }
          }
        },
        "put": {
          "tags": [
            "Cultivation Rooms"
          ],
          "summary": "Update a cultivation room",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UpdateCultivationRoomRequest"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Cultivation room updated successfully"
            },
            "404": {
              "description": "Cultivation room not found"
            }
          }
        },
        "delete": {
          "tags": [
            "Cultivation Rooms"
          ],
          "summary": "Delete a cultivation room",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Cultivation room deleted successfully"
            },
            "409": {
              "description": "Room is still referenced by trays or devices"
            }
          }
        }
      },
      "/api/cameras": {
        "get": {
          "tags": [
            "Cameras"
          ],
          "summary": "List cameras",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "roomId",
              "schema": {
                "type": "integer"
              }
            },
            {
              "in": "query",
              "name": "status",
              "schema": {
                "type": "string",
                "enum": [
                  "ACTIVE",
                  "INACTIVE",
                  "OFFLINE"
                ]
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Camera list"
            },
            "403": {
              "description": "Administrator access required"
            }
          }
        },
        "post": {
          "tags": [
            "Cameras"
          ],
          "summary": "Register an Imou camera",
          "description": "cameraCode stores the Imou device ID used by the live-stream endpoint.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "roomId",
                    "cameraCode",
                    "cameraName"
                  ],
                  "properties": {
                    "roomId": {
                      "type": "integer"
                    },
                    "cameraCode": {
                      "type": "string",
                      "description": "Imou cloud device ID"
                    },
                    "cameraName": {
                      "type": "string"
                    },
                    "streamUrl": {
                      "type": "string",
                      "nullable": true
                    },
                    "status": {
                      "type": "string",
                      "enum": [
                        "ACTIVE",
                        "INACTIVE",
                        "OFFLINE"
                      ]
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Camera created successfully"
            },
            "400": {
              "description": "Invalid camera data"
            },
            "403": {
              "description": "Administrator access required"
            },
            "409": {
              "description": "cameraCode already exists"
            }
          }
        }
      },
      "/api/cameras/live-streams": {
        "get": {
          "tags": [
            "Cameras"
          ],
          "summary": "List current Imou live sessions for registered cameras",
          "description": "Reads current stream information without starting a new session. HLS URLs are temporary and live tokens are never returned.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "cameraId",
              "schema": {
                "type": "integer"
              }
            },
            {
              "in": "query",
              "name": "roomId",
              "description": "Page size, from 1 to 50",
              "schema": {
                "type": "integer"
              }
            },
            {
              "in": "query",
              "name": "channelIds",
              "description": "Comma-separated Imou channel IDs. Defaults to 0.",
              "schema": {
                "type": "string",
                "example": "0,1"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Current live sessions"
            },
            "502": {
              "description": "Imou cloud request failed"
            }
          }
        }
      },
      "/api/cameras/live-streams/stop": {
        "post": {
          "tags": [
            "Cameras"
          ],
          "summary": "Stop an Imou live session",
          "description": "Uses liveToken returned by GET /api/cameras/live-streams. Only administrators can manage Imou sessions.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "liveToken"
                  ],
                  "properties": {
                    "liveToken": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Live session stopped"
            },
            "400": {
              "description": "liveToken is required"
            },
            "502": {
              "description": "Imou cloud request failed"
            }
          }
        }
      },
      "/api/cameras/{cameraId}/imou-player-token": {
        "get": {
          "tags": [
            "Cameras"
          ],
          "summary": "Get a scoped Imou KitToken for ImouPlayer",
          "description": "Returns a short-lived KitToken for live preview. The Imou App Secret and Open Platform access token are never exposed.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "cameraId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            },
            {
              "in": "query",
              "name": "channelId",
              "schema": {
                "type": "string",
                "default": "0"
              }
            },
            {
              "in": "query",
              "name": "streamId",
              "description": "ImouPlayer stream ID (0 or 1)",
              "schema": {
                "type": "integer",
                "enum": [
                  0,
                  1
                ],
                "default": 0
              }
            }
          ],
          "responses": {
            "200": {
              "description": "ImouPlayer configuration and KitToken"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "404": {
              "description": "Camera not found"
            },
            "409": {
              "description": "Camera is not active or has no Imou device ID configured"
            },
            "502": {
              "description": "Imou cloud request failed"
            },
            "503": {
              "description": "Imou cloud credentials are not configured"
            }
          }
        }
      },
      "/api/cameras/{cameraId}": {
        "get": {
          "tags": [
            "Cameras"
          ],
          "summary": "Get camera details",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "cameraId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Camera details"
            },
            "404": {
              "description": "Camera not found"
            }
          }
        },
        "put": {
          "tags": [
            "Cameras"
          ],
          "summary": "Update camera details",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "cameraId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "roomId": {
                      "type": "integer"
                    },
                    "cameraCode": {
                      "type": "string"
                    },
                    "cameraName": {
                      "type": "string"
                    },
                    "streamUrl": {
                      "type": "string",
                      "nullable": true
                    },
                    "status": {
                      "type": "string",
                      "enum": [
                        "ACTIVE",
                        "INACTIVE",
                        "OFFLINE"
                      ]
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Camera updated successfully"
            },
            "400": {
              "description": "Invalid camera data"
            },
            "404": {
              "description": "Camera or room not found"
            },
            "409": {
              "description": "cameraCode already exists"
            }
          }
        },
        "delete": {
          "tags": [
            "Cameras"
          ],
          "summary": "Delete a camera",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "cameraId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Camera deleted successfully"
            },
            "404": {
              "description": "Camera not found"
            },
            "409": {
              "description": "Camera is referenced by another record"
            }
          }
        }
      },
      "/api/cameras/{cameraId}/live-stream": {
        "get": {
          "tags": [
            "Cameras"
          ],
          "summary": "Get a temporary Imou cloud live-stream link",
          "description": "The camera's camera_code must contain its Imou cloud device ID. Any authenticated user can view the stream.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "cameraId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            },
            {
              "in": "query",
              "name": "channelId",
              "required": false,
              "description": "Imou device channel; defaults to 0",
              "schema": {
                "type": "string",
                "default": "0"
              }
            },
            {
              "in": "query",
              "name": "streamId",
              "required": false,
              "description": "Imou stream ID; defaults to 0",
              "schema": {
                "type": "integer",
                "enum": [
                  0,
                  1
                ],
                "default": 0
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Temporary stream information returned by Imou"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "404": {
              "description": "Camera not found"
            },
            "502": {
              "description": "Imou cloud request failed"
            },
            "503": {
              "description": "Imou cloud credentials are not configured"
            }
          }
        },
        "post": {
          "tags": [
            "Cameras"
          ],
          "summary": "Start or retrieve an Imou cloud live stream",
          "description": "Any authenticated user can start or retrieve the stream for viewing.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "cameraId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            },
            {
              "in": "query",
              "name": "channelId",
              "schema": {
                "type": "string",
                "default": "0"
              }
            },
            {
              "in": "query",
              "name": "streamId",
              "schema": {
                "type": "integer",
                "enum": [
                  0,
                  1
                ],
                "default": 0
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Live stream URL"
            },
            "409": {
              "description": "Camera is not active"
            },
            "502": {
              "description": "Imou cloud request failed"
            }
          }
        }
      },
      "/api/cameras/{cameraId}/live-stream/stop": {
        "post": {
          "tags": [
            "Cameras"
          ],
          "summary": "Stop an Imou live session for a camera channel",
          "description": "Ends the cloud live session using its live token. This does not change local camera status.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "cameraId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            },
            {
              "in": "query",
              "name": "channelId",
              "schema": {
                "type": "string",
                "default": "0"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Session stopped or no active session exists"
            },
            "403": {
              "description": "Administrator access required"
            },
            "502": {
              "description": "Imou cloud request failed"
            }
          }
        }
      },
      "/api/auth/register": {
        "post": {
          "tags": [
            "Authentication"
          ],
          "summary": "Register a user without email OTP verification",
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/RegisterRequest"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Registration successful; returns the new user and JWT token",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/AuthResponse"
                  }
                }
              }
            },
            "400": {
              "description": "Invalid input or role does not exist"
            },
            "409": {
              "description": "Email is already registered"
            }
          }
        }
      },
      "/api/auth/login": {
        "post": {
          "tags": [
            "Authentication"
          ],
          "summary": "Login and receive a JWT token",
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LoginRequest"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Login successful",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/AuthResponse"
                  }
                }
              }
            },
            "401": {
              "description": "Invalid email or password"
            },
            "403": {
              "description": "User account is not active"
            }
          }
        }
      },
      "/api/auth/me": {
        "get": {
          "tags": [
            "Authentication"
          ],
          "summary": "Get the current authenticated user",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "responses": {
            "200": {
              "description": "Current user",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "user": {
                        "$ref": "#/components/schemas/User"
                      }
                    }
                  }
                }
              }
            },
            "401": {
              "description": "Missing or invalid JWT token"
            }
          }
        }
      },
      "/api/auth/register-otp": {
        "post": {
          "tags": [
            "Auth OTP"
          ],
          "summary": "Register an unverified customer and send a registration OTP",
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "name",
                    "email",
                    "password"
                  ],
                  "properties": {
                    "name": {
                      "type": "string",
                      "example": "Nguyen Van A"
                    },
                    "email": {
                      "type": "string",
                      "format": "email",
                      "example": "user@example.com"
                    },
                    "password": {
                      "type": "string",
                      "minLength": 6,
                      "example": "password123"
                    },
                    "phone": {
                      "type": "string",
                      "example": "0900000000"
                    },
                    "address": {
                      "type": "string",
                      "example": "Ho Chi Minh City"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "OTP email sent"
            },
            "400": {
              "description": "Missing or invalid input"
            },
            "409": {
              "description": "Email is already registered"
            },
            "429": {
              "description": "OTP cooldown or rate limit exceeded"
            },
            "500": {
              "description": "Unable to send OTP email"
            }
          }
        }
      },
      "/api/auth/verify-registration-otp": {
        "post": {
          "tags": [
            "Auth OTP"
          ],
          "summary": "Verify a registration OTP",
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "email",
                    "otp"
                  ],
                  "properties": {
                    "email": {
                      "type": "string",
                      "format": "email",
                      "example": "user@example.com"
                    },
                    "otp": {
                      "type": "string",
                      "example": "123456"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Email verified"
            },
            "400": {
              "description": "Missing or invalid OTP"
            },
            "429": {
              "description": "Too many invalid OTP attempts or rate limit exceeded"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        }
      },
      "/api/auth/forgot-password": {
        "post": {
          "tags": [
            "Auth OTP"
          ],
          "summary": "Request a password-reset OTP",
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "email"
                  ],
                  "properties": {
                    "email": {
                      "type": "string",
                      "format": "email",
                      "example": "user@example.com"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Generic OTP request response"
            },
            "400": {
              "description": "Missing email"
            },
            "429": {
              "description": "Rate limit exceeded"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        }
      },
      "/api/auth/reset-password-otp": {
        "post": {
          "tags": [
            "Auth OTP"
          ],
          "summary": "Reset a password with a password-reset OTP",
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "email",
                    "otp",
                    "new_password"
                  ],
                  "properties": {
                    "email": {
                      "type": "string",
                      "format": "email",
                      "example": "user@example.com"
                    },
                    "otp": {
                      "type": "string",
                      "example": "123456"
                    },
                    "new_password": {
                      "type": "string",
                      "minLength": 6,
                      "example": "newpassword123"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Password reset"
            },
            "400": {
              "description": "Missing or invalid OTP or password"
            },
            "429": {
              "description": "Too many invalid OTP attempts or rate limit exceeded"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        }
      },
      "/api/auth/request-change-password-otp": {
        "post": {
          "tags": [
            "Auth OTP"
          ],
          "summary": "Request an OTP to change the current password",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "responses": {
            "200": {
              "description": "OTP email sent"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "404": {
              "description": "User not found"
            },
            "429": {
              "description": "OTP cooldown or rate limit exceeded"
            },
            "500": {
              "description": "Unable to send OTP email"
            }
          }
        }
      },
      "/api/auth/change-password-otp": {
        "put": {
          "tags": [
            "Auth OTP"
          ],
          "summary": "Change the current password with an OTP",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "otp",
                    "new_password"
                  ],
                  "properties": {
                    "otp": {
                      "type": "string",
                      "example": "123456"
                    },
                    "new_password": {
                      "type": "string",
                      "minLength": 6,
                      "example": "newpassword123"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Password changed"
            },
            "400": {
              "description": "Missing or invalid OTP or password"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "404": {
              "description": "User not found"
            },
            "429": {
              "description": "Too many invalid OTP attempts or rate limit exceeded"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        }
      },
      "/api/analytics/dashboard": {
        "get": {
          "tags": [
            "Analytics"
          ],
          "summary": "Get all-time dashboard revenue, tray usages and harvest quality percentages",
          "description": "Roles: 1 = Admin, 2 = Farm Operator, 3 = Customer. Only roles 1 and 2 may access. Revenue sums orders.total_amount where orders.payment_status is PAID, regardless of order status. Trays count ACTIVE or RELEASED assignments in CULTIVATING, HARVEST_READY, HARVESTING or COMPLETED sessions; cancelled and pre-cultivation sessions are excluded. Repeated use of a physical tray counts each assignment. Harvest quality includes COMPLETED harvests with all three weights present and nonnegative. usable_rate = usable harvested weight / total harvested weight × 100; waste_rate = rejected harvested weight / total harvested weight × 100. Rates are percentages rounded to at most two decimals, without normalization to 100. Empty metrics and rates with zero total weight return 0. No date filter.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "responses": {
            "200": {
              "description": "Dashboard metrics (quality rates are percentages)",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "required": [
                      "data"
                    ],
                    "properties": {
                      "data": {
                        "type": "object",
                        "required": [
                          "revenue",
                          "trays_used",
                          "harvest_quality"
                        ],
                        "properties": {
                          "revenue": {
                            "type": "object",
                            "required": [
                              "value",
                              "currency"
                            ],
                            "properties": {
                              "value": {
                                "type": "number",
                                "example": 128500000
                              },
                              "currency": {
                                "type": "string",
                                "enum": [
                                  "VND"
                                ]
                              }
                            }
                          },
                          "trays_used": {
                            "type": "integer",
                            "example": 36
                          },
                          "harvest_quality": {
                            "type": "object",
                            "required": [
                              "usable_rate",
                              "waste_rate"
                            ],
                            "properties": {
                              "usable_rate": {
                                "type": "number",
                                "description": "Percentage of total harvested weight that is usable",
                                "example": 93
                              },
                              "waste_rate": {
                                "type": "number",
                                "description": "Percentage of total harvested weight that is rejected",
                                "example": 7
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Admin or Farm Operator role required"
            }
          }
        }
      },
      "/api/iot/masters": {
        "get": {
          "tags": [
            "IoT"
          ],
          "summary": "List registered masters",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "description": "Requires an active authenticated user, matching cultivation-room read access. Timestamps describe backend arrival. Retained online status may be stale. Command completion timestamps describe publication attempts, not actuation.",
          "parameters": [],
          "responses": {
            "200": {
              "description": "Success",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "array",
                        "items": {
                          "$ref": "#/components/schemas/IotMaster"
                        }
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid input",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "401": {
              "description": "Missing or invalid JWT",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "404": {
              "description": "Resource not found",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "500": {
              "description": "Database or server error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            }
          }
        }
      },
      "/api/iot/masters/{masterId}/sensors": {
        "get": {
          "tags": [
            "IoT"
          ],
          "summary": "Latest sensors, preserving last valid values on failure",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "description": "Requires an active authenticated user, matching cultivation-room read access. Timestamps describe backend arrival. Retained online status may be stale. Command completion timestamps describe publication attempts, not actuation.",
          "parameters": [
            {
              "in": "path",
              "name": "masterId",
              "required": true,
              "schema": {
                "type": "string",
                "pattern": "^[A-Za-z0-9_-]{1,64}$",
                "example": "master01"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Success",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "$ref": "#/components/schemas/IotSensors"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid input",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "401": {
              "description": "Missing or invalid JWT",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "404": {
              "description": "Resource not found",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "500": {
              "description": "Database or server error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            }
          }
        }
      },
      "/api/iot/masters/{masterId}/nodes/{nodeId}/sensors/{sensorId}": {
        "get": {
          "tags": [
            "IoT"
          ],
          "summary": "Get latest sensor state",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "description": "Requires an active authenticated user, matching cultivation-room read access. Timestamps describe backend arrival. Retained online status may be stale. Command completion timestamps describe publication attempts, not actuation.",
          "parameters": [
            {
              "in": "path",
              "name": "masterId",
              "required": true,
              "schema": {
                "type": "string",
                "pattern": "^[A-Za-z0-9_-]{1,64}$",
                "example": "master01"
              }
            },
            {
              "in": "path",
              "name": "nodeId",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1,
                "maximum": 247,
                "example": 1
              }
            },
            {
              "in": "path",
              "name": "sensorId",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1,
                "maximum": 3,
                "example": 1
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Success",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "$ref": "#/components/schemas/IotSensor"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid input",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "401": {
              "description": "Missing or invalid JWT",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "404": {
              "description": "Resource not found",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "500": {
              "description": "Database or server error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            }
          }
        }
      },
      "/api/iot/masters/{masterId}/nodes/{nodeId}/sensors/{sensorId}/history": {
        "get": {
          "tags": [
            "IoT"
          ],
          "summary": "Sensor history ordered by receivedAt descending",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "description": "Requires an active authenticated user, matching cultivation-room read access. Timestamps describe backend arrival. Retained online status may be stale. Command completion timestamps describe publication attempts, not actuation.",
          "parameters": [
            {
              "in": "path",
              "name": "masterId",
              "required": true,
              "schema": {
                "type": "string",
                "pattern": "^[A-Za-z0-9_-]{1,64}$",
                "example": "master01"
              }
            },
            {
              "in": "path",
              "name": "nodeId",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1,
                "maximum": 247,
                "example": 1
              }
            },
            {
              "in": "path",
              "name": "sensorId",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1,
                "maximum": 3,
                "example": 1
              }
            },
            {
              "name": "from",
              "in": "query",
              "schema": {
                "type": "string",
                "format": "date-time"
              }
            },
            {
              "name": "to",
              "in": "query",
              "schema": {
                "type": "string",
                "format": "date-time"
              }
            },
            {
              "name": "limit",
              "in": "query",
              "schema": {
                "type": "integer",
                "minimum": 1,
                "maximum": 1000,
                "default": 100
              }
            },
            {
              "name": "offset",
              "in": "query",
              "schema": {
                "type": "integer",
                "minimum": 0,
                "maximum": 1000000,
                "default": 0
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Success",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "$ref": "#/components/schemas/IotHistory"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid input",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "401": {
              "description": "Missing or invalid JWT",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "404": {
              "description": "Resource not found",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "500": {
              "description": "Database or server error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            }
          }
        }
      },
      "/api/iot/masters/{masterId}/ssr": {
        "get": {
          "tags": [
            "IoT"
          ],
          "summary": "All eight SSR channels; unreported values are null",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "description": "Requires an active authenticated user, matching cultivation-room read access. Timestamps describe backend arrival. Retained online status may be stale. Command completion timestamps describe publication attempts, not actuation.",
          "parameters": [
            {
              "in": "path",
              "name": "masterId",
              "required": true,
              "schema": {
                "type": "string",
                "pattern": "^[A-Za-z0-9_-]{1,64}$",
                "example": "master01"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Success",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "$ref": "#/components/schemas/IotSsr"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid input",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "401": {
              "description": "Missing or invalid JWT",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "404": {
              "description": "Resource not found",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "500": {
              "description": "Database or server error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            }
          }
        }
      },
      "/api/iot/masters/{masterId}/ssr/{channel}/commands": {
        "post": {
          "tags": [
            "IoT"
          ],
          "summary": "Request manual SSR ON/OFF",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "description": "Requires a valid JWT for any active user, including customers. No role or user allowlist is applied. MQTT credentials authenticate the backend to the broker, not the API caller. Publishes plain ON/OFF, QoS 1, retain false, with a five-second deadline. PUBLISHED means broker PUBACK only. No command IDs in firmware feedback; matching state cannot acknowledge this command. Do not automatically retry failures/timeouts.",
          "parameters": [
            {
              "in": "path",
              "name": "masterId",
              "required": true,
              "schema": {
                "type": "string",
                "pattern": "^[A-Za-z0-9_-]{1,64}$",
                "example": "master01"
              }
            },
            {
              "in": "path",
              "name": "channel",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1,
                "maximum": 8,
                "example": 1
              }
            }
          ],
          "responses": {
            "202": {
              "description": "Broker accepted publication; physical state is unverified",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "$ref": "#/components/schemas/IotCommand"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid input",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "401": {
              "description": "Missing or invalid JWT",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "404": {
              "description": "Resource not found",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "409": {
              "description": "Channel publication in progress",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "500": {
              "description": "Database or server error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "503": {
              "description": "MQTT unavailable or publication failed",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "504": {
              "description": "Publication deadline elapsed; delivery unknown",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            }
          },
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "action"
                  ],
                  "properties": {
                    "action": {
                      "type": "string",
                      "enum": [
                        "ON",
                        "OFF"
                      ]
                    }
                  }
                },
                "example": {
                  "action": "ON"
                }
              }
            }
          }
        }
      },
      "/api/iot/commands/{commandId}": {
        "get": {
          "tags": [
            "IoT"
          ],
          "summary": "Persisted command publication status (no correlated acknowledgment)",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "description": "Requires an active authenticated user, matching cultivation-room read access. Timestamps describe backend arrival. Retained online status may be stale. Command completion timestamps describe publication attempts, not actuation.",
          "parameters": [
            {
              "in": "path",
              "name": "commandId",
              "required": true,
              "schema": {
                "type": "string",
                "format": "uuid"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Success",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "$ref": "#/components/schemas/IotCommand"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid input",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "401": {
              "description": "Missing or invalid JWT",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "404": {
              "description": "Resource not found",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "500": {
              "description": "Database or server error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            }
          }
        }
      },
      "/api/iot/masters/{masterId}/light": {
        "put": {
          "tags": [
            "IoT"
          ],
          "summary": "Configure the shared room light channel",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "description": "Requires iot.automation.manage. Master must belong to a room. Rejects channels assigned to floor valves. Null removes the mapping. Does not switch relays or publish MQTT.",
          "parameters": [
            {
              "in": "path",
              "name": "masterId",
              "required": true,
              "schema": {
                "type": "string",
                "pattern": "^[A-Za-z0-9_-]{1,64}$",
                "example": "master01"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Success",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "$ref": "#/components/schemas/IotMaster"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid input",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "401": {
              "description": "Missing or invalid JWT",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "403": {
              "description": "Missing iot.automation.manage permission"
            },
            "404": {
              "description": "Resource not found",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            },
            "409": {
              "description": "Master has no room or channel is assigned to a floor valve"
            },
            "500": {
              "description": "Database or server error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            }
          },
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "channel"
                  ],
                  "properties": {
                    "channel": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 8,
                      "nullable": true
                    }
                  }
                },
                "example": {
                  "channel": 3
                }
              }
            }
          }
        }
      },
      "/api/iot/floors": {
        "get": {
          "tags": [
            "Automatic misting"
          ],
          "summary": "List floor mappings",
          "description": " Authenticated read access.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [],
          "responses": {
            "200": {
              "description": "Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "additionalProperties": false,
                          "required": [
                            "room_id",
                            "floor_number",
                            "floor_name",
                            "master_id",
                            "node_address",
                            "misting_ssr_channel"
                          ],
                          "properties": {
                            "room_id": {
                              "type": "integer",
                              "minimum": 1
                            },
                            "floor_number": {
                              "type": "integer",
                              "minimum": 1
                            },
                            "floor_name": {
                              "type": "string",
                              "maxLength": 200
                            },
                            "master_id": {
                              "type": "integer",
                              "minimum": 1
                            },
                            "node_address": {
                              "type": "integer",
                              "minimum": 1,
                              "maximum": 247
                            },
                            "misting_ssr_channel": {
                              "type": "integer",
                              "minimum": 1,
                              "maximum": 8
                            },
                            "status": {
                              "type": "string",
                              "enum": [
                                "ACTIVE",
                                "INACTIVE"
                              ]
                            },
                            "total_rows": {
                              "type": "integer",
                              "minimum": 1,
                              "maximum": 32767,
                              "nullable": true
                            },
                            "total_columns": {
                              "type": "integer",
                              "minimum": 1,
                              "maximum": 32767,
                              "nullable": true
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid fields, thresholds, ranges or pagination"
            },
            "401": {
              "description": "JWT missing or invalid"
            },
            "403": {
              "description": "Missing automation permission"
            },
            "404": {
              "description": "Floor not found"
            },
            "409": {
              "description": "Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed"
            },
            "503": {
              "description": "MQTT unavailable; OFF remains pending and is retried"
            }
          }
        },
        "post": {
          "tags": [
            "Automatic misting"
          ],
          "summary": "Create floor mapping",
          "description": "Master must already belong to this room. No inferred node/floor assignments. Requires iot.automation.manage permission.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [],
          "responses": {
            "201": {
              "description": "Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "object"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid fields, thresholds, ranges or pagination"
            },
            "401": {
              "description": "JWT missing or invalid"
            },
            "403": {
              "description": "Missing automation permission"
            },
            "404": {
              "description": "Floor not found"
            },
            "409": {
              "description": "Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed"
            },
            "503": {
              "description": "MQTT unavailable; OFF remains pending and is retried"
            }
          },
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "room_id",
                    "floor_number",
                    "floor_name",
                    "master_id",
                    "node_address",
                    "misting_ssr_channel"
                  ],
                  "properties": {
                    "room_id": {
                      "type": "integer",
                      "minimum": 1
                    },
                    "floor_number": {
                      "type": "integer",
                      "minimum": 1
                    },
                    "floor_name": {
                      "type": "string",
                      "maxLength": 200
                    },
                    "master_id": {
                      "type": "integer",
                      "minimum": 1
                    },
                    "node_address": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 247
                    },
                    "misting_ssr_channel": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 8
                    },
                    "status": {
                      "type": "string",
                      "enum": [
                        "ACTIVE",
                        "INACTIVE"
                      ]
                    },
                    "total_rows": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 32767,
                      "nullable": true
                    },
                    "total_columns": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 32767,
                      "nullable": true
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/api/iot/floors/{floorId}": {
        "put": {
          "tags": [
            "Automatic misting"
          ],
          "summary": "Replace floor mapping",
          "description": "Stop and resolve OFF first. Channels and nodes are unique per master. Requires iot.automation.manage permission.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "name": "floorId",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "object"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid fields, thresholds, ranges or pagination"
            },
            "401": {
              "description": "JWT missing or invalid"
            },
            "403": {
              "description": "Missing automation permission"
            },
            "404": {
              "description": "Floor not found"
            },
            "409": {
              "description": "Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed"
            },
            "503": {
              "description": "MQTT unavailable; OFF remains pending and is retried"
            }
          },
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "room_id",
                    "floor_number",
                    "floor_name",
                    "master_id",
                    "node_address",
                    "misting_ssr_channel"
                  ],
                  "properties": {
                    "room_id": {
                      "type": "integer",
                      "minimum": 1
                    },
                    "floor_number": {
                      "type": "integer",
                      "minimum": 1
                    },
                    "floor_name": {
                      "type": "string",
                      "maxLength": 200
                    },
                    "master_id": {
                      "type": "integer",
                      "minimum": 1
                    },
                    "node_address": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 247
                    },
                    "misting_ssr_channel": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 8
                    },
                    "status": {
                      "type": "string",
                      "enum": [
                        "ACTIVE",
                        "INACTIVE"
                      ]
                    },
                    "total_rows": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 32767,
                      "nullable": true
                    },
                    "total_columns": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 32767,
                      "nullable": true
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/api/iot/floors/{floorId}/trays/generate": {
        "post": {
          "tags": [
            "Automatic misting"
          ],
          "summary": "Generate trays from floor rows and columns",
          "description": "No body required. Uses saved total_rows and total_columns (maximum 10000 trays). Coordinates start at 1. Creates ACTIVE positions and AVAILABLE trays with codes ROOM{roomId}-F{floorNumber}-R{row}-C{column}; the room prefix prevents conflicts between rooms. Existing trays are preserved; repeated calls fill missing positions only. Returns floor_id, total_rows, total_columns, created_count, total and trays ordered by row_number and column_number. Stop AUTO and resolve OFF first. Conflicting positions or trays without positions return 409. All writes are atomic. Requires iot.automation.manage permission.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "name": "floorId",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "object"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid fields, thresholds, ranges or pagination"
            },
            "401": {
              "description": "JWT missing or invalid"
            },
            "403": {
              "description": "Missing automation permission"
            },
            "404": {
              "description": "Floor not found"
            },
            "409": {
              "description": "Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed"
            },
            "503": {
              "description": "MQTT unavailable; OFF remains pending and is retried"
            }
          }
        }
      },
      "/api/iot/floors/{floorId}/trays": {
        "delete": {
          "tags": [
            "Automatic misting"
          ],
          "summary": "Delete all trays on a floor",
          "description": "No body required. Returns floor_id and deleted_count. Keeps tray positions for reuse. Stop AUTO and resolve OFF first. Occupied trays or trays referenced by cultivation records return 409 and nothing is deleted. Requires iot.automation.manage permission. Requires iot.automation.manage permission.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "name": "floorId",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "object"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid fields, thresholds, ranges or pagination"
            },
            "401": {
              "description": "JWT missing or invalid"
            },
            "403": {
              "description": "Missing automation permission"
            },
            "404": {
              "description": "Floor not found"
            },
            "409": {
              "description": "Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed"
            },
            "503": {
              "description": "MQTT unavailable; OFF remains pending and is retried"
            }
          }
        }
      },
      "/api/iot/floors/{floorId}/trays/{trayId}": {
        "put": {
          "tags": [
            "Automatic misting"
          ],
          "summary": "Assign a same-room tray to a stopped floor",
          "description": "Optional body: position_id selects an ACTIVE unoccupied position in this floor and room; null clears the position, omission preserves it. Stop AUTO before changing assignment. Requires iot.automation.manage permission.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "name": "floorId",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            },
            {
              "name": "trayId",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "object"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid fields, thresholds, ranges or pagination"
            },
            "401": {
              "description": "JWT missing or invalid"
            },
            "403": {
              "description": "Missing automation permission"
            },
            "404": {
              "description": "Floor not found"
            },
            "409": {
              "description": "Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed"
            },
            "503": {
              "description": "MQTT unavailable; OFF remains pending and is retried"
            }
          },
          "requestBody": {
            "required": false,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "position_id": {
                      "type": "integer",
                      "minimum": 1,
                      "nullable": true
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/api/iot/floors/{floorId}/environment": {
        "get": {
          "tags": [
            "Automatic misting"
          ],
          "summary": "Get three sensors, averages, freshness and thresholds",
          "description": " Authenticated read access.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "name": "floorId",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "object",
                        "properties": {
                          "masterId": {
                            "type": "string"
                          },
                          "nodeId": {
                            "type": "integer"
                          },
                          "averageHumidity": {
                            "type": "number",
                            "nullable": true
                          },
                          "averageTemperature": {
                            "type": "number",
                            "nullable": true
                          },
                          "temperatureSpread": {
                            "type": "number",
                            "nullable": true
                          },
                          "healthy": {
                            "type": "boolean"
                          },
                          "reason": {
                            "type": "string",
                            "nullable": true
                          },
                          "sensors": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "sensorId": {
                                  "type": "integer"
                                },
                                "humidity": {
                                  "type": "number",
                                  "nullable": true
                                },
                                "valid": {
                                  "type": "boolean"
                                },
                                "ageMs": {
                                  "type": "number",
                                  "nullable": true
                                },
                                "retained": {
                                  "type": "boolean"
                                }
                              }
                            }
                          },
                          "thresholds": {
                            "type": "object",
                            "additionalProperties": false,
                            "required": [
                              "humidity_min",
                              "humidity_max",
                              "humidity_start_threshold",
                              "humidity_stop_threshold",
                              "misting_pulse_ms",
                              "cooldown_ms",
                              "evaluation_interval_ms",
                              "max_sensor_spread_percent",
                              "max_activations_per_hour",
                              "max_cumulative_on_ms_per_hour"
                            ],
                            "properties": {
                              "mushroom_type_id": {
                                "type": "integer",
                                "minimum": 1,
                                "maximum": 2147483647
                              },
                              "humidity_min": {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 100
                              },
                              "humidity_max": {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 100
                              },
                              "humidity_start_threshold": {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 100
                              },
                              "humidity_stop_threshold": {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 100
                              },
                              "misting_pulse_ms": {
                                "type": "integer",
                                "minimum": 1000,
                                "maximum": 60000
                              },
                              "cooldown_ms": {
                                "type": "integer",
                                "minimum": 1000,
                                "maximum": 86400000
                              },
                              "evaluation_interval_ms": {
                                "type": "integer",
                                "minimum": 1000,
                                "maximum": 60000
                              },
                              "sensor_max_age_ms": {
                                "type": "integer",
                                "minimum": 1000,
                                "maximum": 300000
                              },
                              "required_valid_sensors": {
                                "type": "integer",
                                "minimum": 1,
                                "maximum": 3
                              },
                              "max_sensor_spread_percent": {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 100
                              },
                              "max_activations_per_hour": {
                                "type": "integer",
                                "minimum": 1,
                                "maximum": 3600
                              },
                              "max_cumulative_on_ms_per_hour": {
                                "type": "integer",
                                "minimum": 1000,
                                "maximum": 3600000
                              },
                              "profile_name": {
                                "type": "string",
                                "maxLength": 200,
                                "nullable": true
                              },
                              "profile_approved": {
                                "type": "boolean",
                                "default": false
                              },
                              "mushroom_type_ids": {
                                "type": "array",
                                "minItems": 1,
                                "uniqueItems": true,
                                "items": {
                                  "type": "integer",
                                  "minimum": 1,
                                  "maximum": 2147483647
                                },
                                "description": "FLOOR only: approve crop types before assigning sessions. Server reads conditions and stores source_profiles. Must include all crops currently on the floor."
                              },
                              "config_source": {
                                "type": "string",
                                "enum": [
                                  "LEGACY",
                                  "FLOOR"
                                ],
                                "default": "LEGACY",
                                "description": "FLOOR derives crop types from assigned tray sessions; requires a reviewed named profile. LEGACY requires mushroom_type_id."
                              },
                              "cooling_enabled": {
                                "type": "boolean",
                                "default": false,
                                "description": "When true all temperature fields and cooling_humidity_limit are required."
                              },
                              "temperature_min": {
                                "type": "number",
                                "minimum": -40,
                                "maximum": 80
                              },
                              "temperature_max": {
                                "type": "number",
                                "minimum": -40,
                                "maximum": 80
                              },
                              "temperature_start_threshold": {
                                "type": "number",
                                "minimum": -40,
                                "maximum": 80
                              },
                              "temperature_stop_threshold": {
                                "type": "number",
                                "minimum": -40,
                                "maximum": 80
                              },
                              "cooling_humidity_limit": {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 100
                              },
                              "max_temperature_spread_c": {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 20
                              }
                            }
                          }
                        }
                      }
                    }
                  },
                  "example": {
                    "data": {
                      "masterId": "master01",
                      "nodeId": 7,
                      "averageHumidity": 84,
                      "averageTemperature": 26,
                      "healthy": true,
                      "reason": null,
                      "sensors": [
                        {
                          "sensorId": 1,
                          "humidity": 82,
                          "valid": true,
                          "ageMs": 1000
                        },
                        {
                          "sensorId": 2,
                          "humidity": 84,
                          "valid": true,
                          "ageMs": 1000
                        },
                        {
                          "sensorId": 3,
                          "humidity": 86,
                          "valid": true,
                          "ageMs": 1000
                        }
                      ]
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid fields, thresholds, ranges or pagination"
            },
            "401": {
              "description": "JWT missing or invalid"
            },
            "403": {
              "description": "Missing automation permission"
            },
            "404": {
              "description": "Floor not found"
            },
            "409": {
              "description": "Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed"
            },
            "503": {
              "description": "MQTT unavailable; OFF remains pending and is retried"
            }
          }
        }
      },
      "/api/iot/floors/{floorId}/auto-control": {
        "get": {
          "tags": [
            "Automatic misting"
          ],
          "summary": "Read saved configuration, mode, cultivation conflicts and suggestions",
          "description": " Authenticated read access.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "name": "floorId",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "object"
                      }
                    }
                  },
                  "example": {
                    "data": {
                      "mode": "MANUAL",
                      "config": {
                        "mushroom_type_id": 1,
                        "humidity_min": 85,
                        "humidity_max": 95,
                        "humidity_start_threshold": 83,
                        "humidity_stop_threshold": 87,
                        "misting_pulse_ms": 5000,
                        "cooldown_ms": 60000,
                        "evaluation_interval_ms": 5000,
                        "sensor_max_age_ms": 20000,
                        "required_valid_sensors": 3,
                        "max_sensor_spread_percent": 10,
                        "max_activations_per_hour": 20,
                        "max_cumulative_on_ms_per_hour": 100000
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid fields, thresholds, ranges or pagination"
            },
            "401": {
              "description": "JWT missing or invalid"
            },
            "403": {
              "description": "Missing automation permission"
            },
            "404": {
              "description": "Floor not found"
            },
            "409": {
              "description": "Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed"
            },
            "503": {
              "description": "MQTT unavailable; OFF remains pending and is retried"
            }
          }
        },
        "put": {
          "tags": [
            "Automatic misting"
          ],
          "summary": "Save configuration without starting AUTO",
          "description": "Example thresholds are for simulation only. Save remains MANUAL. Stop before edits. Requires iot.automation.manage permission.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "name": "floorId",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "object"
                      }
                    }
                  },
                  "example": {
                    "data": {
                      "mode": "MANUAL",
                      "config": {
                        "mushroom_type_id": 1,
                        "humidity_min": 85,
                        "humidity_max": 95,
                        "humidity_start_threshold": 83,
                        "humidity_stop_threshold": 87,
                        "misting_pulse_ms": 5000,
                        "cooldown_ms": 60000,
                        "evaluation_interval_ms": 5000,
                        "sensor_max_age_ms": 20000,
                        "required_valid_sensors": 3,
                        "max_sensor_spread_percent": 10,
                        "max_activations_per_hour": 20,
                        "max_cumulative_on_ms_per_hour": 100000
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid fields, thresholds, ranges or pagination"
            },
            "401": {
              "description": "JWT missing or invalid"
            },
            "403": {
              "description": "Missing automation permission"
            },
            "404": {
              "description": "Floor not found"
            },
            "409": {
              "description": "Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed"
            },
            "503": {
              "description": "MQTT unavailable; OFF remains pending and is retried"
            }
          },
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "humidity_min",
                    "humidity_max",
                    "humidity_start_threshold",
                    "humidity_stop_threshold",
                    "misting_pulse_ms",
                    "cooldown_ms",
                    "evaluation_interval_ms",
                    "max_sensor_spread_percent",
                    "max_activations_per_hour",
                    "max_cumulative_on_ms_per_hour"
                  ],
                  "properties": {
                    "mushroom_type_id": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 2147483647
                    },
                    "humidity_min": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "humidity_max": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "humidity_start_threshold": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "humidity_stop_threshold": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "misting_pulse_ms": {
                      "type": "integer",
                      "minimum": 1000,
                      "maximum": 60000
                    },
                    "cooldown_ms": {
                      "type": "integer",
                      "minimum": 1000,
                      "maximum": 86400000
                    },
                    "evaluation_interval_ms": {
                      "type": "integer",
                      "minimum": 1000,
                      "maximum": 60000
                    },
                    "sensor_max_age_ms": {
                      "type": "integer",
                      "minimum": 1000,
                      "maximum": 300000
                    },
                    "required_valid_sensors": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 3
                    },
                    "max_sensor_spread_percent": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "max_activations_per_hour": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 3600
                    },
                    "max_cumulative_on_ms_per_hour": {
                      "type": "integer",
                      "minimum": 1000,
                      "maximum": 3600000
                    },
                    "profile_name": {
                      "type": "string",
                      "maxLength": 200,
                      "nullable": true
                    },
                    "profile_approved": {
                      "type": "boolean",
                      "default": false
                    },
                    "mushroom_type_ids": {
                      "type": "array",
                      "minItems": 1,
                      "uniqueItems": true,
                      "items": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 2147483647
                      },
                      "description": "FLOOR only: approve crop types before assigning sessions. Server reads conditions and stores source_profiles. Must include all crops currently on the floor."
                    },
                    "config_source": {
                      "type": "string",
                      "enum": [
                        "LEGACY",
                        "FLOOR"
                      ],
                      "default": "LEGACY",
                      "description": "FLOOR derives crop types from assigned tray sessions; requires a reviewed named profile. LEGACY requires mushroom_type_id."
                    },
                    "cooling_enabled": {
                      "type": "boolean",
                      "default": false,
                      "description": "When true all temperature fields and cooling_humidity_limit are required."
                    },
                    "temperature_min": {
                      "type": "number",
                      "minimum": -40,
                      "maximum": 80
                    },
                    "temperature_max": {
                      "type": "number",
                      "minimum": -40,
                      "maximum": 80
                    },
                    "temperature_start_threshold": {
                      "type": "number",
                      "minimum": -40,
                      "maximum": 80
                    },
                    "temperature_stop_threshold": {
                      "type": "number",
                      "minimum": -40,
                      "maximum": 80
                    },
                    "cooling_humidity_limit": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "max_temperature_spread_c": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 20
                    }
                  }
                },
                "example": {
                  "mushroom_type_id": 1,
                  "humidity_min": 85,
                  "humidity_max": 95,
                  "humidity_start_threshold": 83,
                  "humidity_stop_threshold": 87,
                  "misting_pulse_ms": 5000,
                  "cooldown_ms": 60000,
                  "evaluation_interval_ms": 5000,
                  "sensor_max_age_ms": 20000,
                  "required_valid_sensors": 3,
                  "max_sensor_spread_percent": 10,
                  "max_activations_per_hour": 20,
                  "max_cumulative_on_ms_per_hour": 100000
                }
              }
            }
          }
        }
      },
      "/api/iot/floors/{floorId}/auto-control/suggestions": {
        "get": {
          "tags": [
            "Automatic misting"
          ],
          "summary": "Suggest a shared floor climate configuration",
          "description": "Requires iot.automation.manage. Uses ACTIVE cultivation sessions and their ACTIVE session-tray assignments on this floor; returns sourceProfiles, common, issues, warnings, config. Config is null for missing, conflicting or too narrow conditions. No database writes or device commands. Review preset, set profile_approved=true and PUT config to auto-control. Authenticated read access.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "name": "floorId",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "object"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid fields, thresholds, ranges or pagination"
            },
            "401": {
              "description": "JWT missing or invalid"
            },
            "403": {
              "description": "Missing automation permission"
            },
            "404": {
              "description": "Floor not found"
            },
            "409": {
              "description": "Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed"
            },
            "503": {
              "description": "MQTT unavailable; OFF remains pending and is retried"
            }
          }
        }
      },
      "/api/iot/floors/{floorId}/auto-control/start": {
        "post": {
          "tags": [
            "Automatic misting"
          ],
          "summary": "Explicitly start a run",
          "description": "Fresh non-retained sensors required. Real runs require MQTT and a verified local watchdog, then send OFF and wait up to 5 seconds after publication for new non-retained SSR OFF feedback before starting AUTO. Missing feedback returns 504 without starting a run. Default dryRun=true publishes nothing. Requires iot.automation.manage permission.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "name": "floorId",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "responses": {
            "201": {
              "description": "Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "object"
                      }
                    }
                  },
                  "example": {
                    "data": {
                      "mode": "AUTO",
                      "run": {
                        "id": 1,
                        "status": "RUNNING",
                        "dry_run": true,
                        "started_by": 1
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid fields, thresholds, ranges or pagination"
            },
            "401": {
              "description": "JWT missing or invalid"
            },
            "403": {
              "description": "Missing automation permission"
            },
            "404": {
              "description": "Floor not found"
            },
            "409": {
              "description": "Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed"
            },
            "503": {
              "description": "MQTT unavailable; OFF remains pending and is retried"
            },
            "504": {
              "description": "OFF hết thời gian gửi lệnh or no new live OFF feedback within 5 seconds after publication; AUTO was not started"
            }
          },
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "dryRun": {
                      "type": "boolean",
                      "default": true
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/api/iot/floors/{floorId}/auto-control/stop": {
        "post": {
          "tags": [
            "Automatic misting"
          ],
          "summary": "Stop AUTO and request OFF",
          "description": "Blocks new ON; unresolved physical state remains OFF_PENDING. OFF publish success is not confirmation. Requires iot.automation.manage permission.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "name": "floorId",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "object",
                        "properties": {
                          "mode": {
                            "type": "string",
                            "enum": [
                              "MANUAL",
                              "AUTO"
                            ]
                          },
                          "run": {
                            "type": "object",
                            "nullable": true,
                            "properties": {
                              "status": {
                                "type": "string",
                                "enum": [
                                  "RUNNING",
                                  "STOPPED",
                                  "FAULT"
                                ]
                              },
                              "dry_run": {
                                "type": "boolean"
                              },
                              "started_by": {
                                "type": "integer",
                                "nullable": true
                              }
                            }
                          },
                          "runtime": {
                            "type": "object",
                            "properties": {
                              "demand": {
                                "type": "boolean"
                              },
                              "cooling_demand": {
                                "type": "boolean"
                              },
                              "last_reason": {
                                "type": "string",
                                "nullable": true
                              },
                              "control_state": {
                                "type": "string",
                                "enum": [
                                  "DISABLED",
                                  "IDLE",
                                  "ON_REQUESTED",
                                  "MISTING",
                                  "OFF_PENDING",
                                  "COOLDOWN",
                                  "SENSOR_FAULT",
                                  "DEVICE_OFFLINE",
                                  "FAULT"
                                ]
                              },
                              "pulse_started_at": {
                                "type": "string",
                                "format": "date-time",
                                "nullable": true
                              },
                              "pulse_deadline_at": {
                                "type": "string",
                                "format": "date-time",
                                "nullable": true
                              },
                              "last_error": {
                                "type": "string",
                                "nullable": true
                              }
                            }
                          },
                          "environment": {
                            "type": "object",
                            "properties": {
                              "masterId": {
                                "type": "string"
                              },
                              "nodeId": {
                                "type": "integer"
                              },
                              "averageHumidity": {
                                "type": "number",
                                "nullable": true
                              },
                              "averageTemperature": {
                                "type": "number",
                                "nullable": true
                              },
                              "temperatureSpread": {
                                "type": "number",
                                "nullable": true
                              },
                              "healthy": {
                                "type": "boolean"
                              },
                              "reason": {
                                "type": "string",
                                "nullable": true
                              },
                              "sensors": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "sensorId": {
                                      "type": "integer"
                                    },
                                    "humidity": {
                                      "type": "number",
                                      "nullable": true
                                    },
                                    "valid": {
                                      "type": "boolean"
                                    },
                                    "ageMs": {
                                      "type": "number",
                                      "nullable": true
                                    },
                                    "retained": {
                                      "type": "boolean"
                                    }
                                  }
                                }
                              },
                              "thresholds": {
                                "type": "object",
                                "additionalProperties": false,
                                "required": [
                                  "humidity_min",
                                  "humidity_max",
                                  "humidity_start_threshold",
                                  "humidity_stop_threshold",
                                  "misting_pulse_ms",
                                  "cooldown_ms",
                                  "evaluation_interval_ms",
                                  "max_sensor_spread_percent",
                                  "max_activations_per_hour",
                                  "max_cumulative_on_ms_per_hour"
                                ],
                                "properties": {
                                  "mushroom_type_id": {
                                    "type": "integer",
                                    "minimum": 1,
                                    "maximum": 2147483647
                                  },
                                  "humidity_min": {
                                    "type": "number",
                                    "minimum": 0,
                                    "maximum": 100
                                  },
                                  "humidity_max": {
                                    "type": "number",
                                    "minimum": 0,
                                    "maximum": 100
                                  },
                                  "humidity_start_threshold": {
                                    "type": "number",
                                    "minimum": 0,
                                    "maximum": 100
                                  },
                                  "humidity_stop_threshold": {
                                    "type": "number",
                                    "minimum": 0,
                                    "maximum": 100
                                  },
                                  "misting_pulse_ms": {
                                    "type": "integer",
                                    "minimum": 1000,
                                    "maximum": 60000
                                  },
                                  "cooldown_ms": {
                                    "type": "integer",
                                    "minimum": 1000,
                                    "maximum": 86400000
                                  },
                                  "evaluation_interval_ms": {
                                    "type": "integer",
                                    "minimum": 1000,
                                    "maximum": 60000
                                  },
                                  "sensor_max_age_ms": {
                                    "type": "integer",
                                    "minimum": 1000,
                                    "maximum": 300000
                                  },
                                  "required_valid_sensors": {
                                    "type": "integer",
                                    "minimum": 1,
                                    "maximum": 3
                                  },
                                  "max_sensor_spread_percent": {
                                    "type": "number",
                                    "minimum": 0,
                                    "maximum": 100
                                  },
                                  "max_activations_per_hour": {
                                    "type": "integer",
                                    "minimum": 1,
                                    "maximum": 3600
                                  },
                                  "max_cumulative_on_ms_per_hour": {
                                    "type": "integer",
                                    "minimum": 1000,
                                    "maximum": 3600000
                                  },
                                  "profile_name": {
                                    "type": "string",
                                    "maxLength": 200,
                                    "nullable": true
                                  },
                                  "profile_approved": {
                                    "type": "boolean",
                                    "default": false
                                  },
                                  "mushroom_type_ids": {
                                    "type": "array",
                                    "minItems": 1,
                                    "uniqueItems": true,
                                    "items": {
                                      "type": "integer",
                                      "minimum": 1,
                                      "maximum": 2147483647
                                    },
                                    "description": "FLOOR only: approve crop types before assigning sessions. Server reads conditions and stores source_profiles. Must include all crops currently on the floor."
                                  },
                                  "config_source": {
                                    "type": "string",
                                    "enum": [
                                      "LEGACY",
                                      "FLOOR"
                                    ],
                                    "default": "LEGACY",
                                    "description": "FLOOR derives crop types from assigned tray sessions; requires a reviewed named profile. LEGACY requires mushroom_type_id."
                                  },
                                  "cooling_enabled": {
                                    "type": "boolean",
                                    "default": false,
                                    "description": "When true all temperature fields and cooling_humidity_limit are required."
                                  },
                                  "temperature_min": {
                                    "type": "number",
                                    "minimum": -40,
                                    "maximum": 80
                                  },
                                  "temperature_max": {
                                    "type": "number",
                                    "minimum": -40,
                                    "maximum": 80
                                  },
                                  "temperature_start_threshold": {
                                    "type": "number",
                                    "minimum": -40,
                                    "maximum": 80
                                  },
                                  "temperature_stop_threshold": {
                                    "type": "number",
                                    "minimum": -40,
                                    "maximum": 80
                                  },
                                  "cooling_humidity_limit": {
                                    "type": "number",
                                    "minimum": 0,
                                    "maximum": 100
                                  },
                                  "max_temperature_spread_c": {
                                    "type": "number",
                                    "minimum": 0,
                                    "maximum": 20
                                  }
                                }
                              }
                            }
                          },
                          "ssr": {
                            "type": "object",
                            "nullable": true,
                            "properties": {
                              "desired_state": {
                                "type": "string",
                                "enum": [
                                  "ON",
                                  "OFF"
                                ],
                                "nullable": true
                              },
                              "reported_state": {
                                "type": "string",
                                "enum": [
                                  "ON",
                                  "OFF"
                                ],
                                "nullable": true
                              }
                            }
                          },
                          "cooldownRemainingMs": {
                            "type": "number"
                          },
                          "lastDecision": {
                            "type": "object",
                            "nullable": true
                          }
                        }
                      }
                    }
                  },
                  "example": {
                    "data": {
                      "mode": "MANUAL",
                      "run": {
                        "status": "STOPPED",
                        "dry_run": true,
                        "started_by": 1
                      },
                      "runtime": {
                        "control_state": "DISABLED",
                        "pulse_deadline_at": null,
                        "last_error": null
                      },
                      "ssr": {
                        "desired_state": "OFF",
                        "reported_state": "OFF"
                      },
                      "cooldownRemainingMs": 0
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid fields, thresholds, ranges or pagination"
            },
            "401": {
              "description": "JWT missing or invalid"
            },
            "403": {
              "description": "Missing automation permission"
            },
            "404": {
              "description": "Floor not found"
            },
            "409": {
              "description": "Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed"
            },
            "503": {
              "description": "MQTT unavailable; OFF remains pending and is retried"
            }
          }
        }
      },
      "/api/iot/floors/{floorId}/auto-control/status": {
        "get": {
          "tags": [
            "Automatic misting"
          ],
          "summary": "Get run, operator, desired/reported SSR, deadlines and errors",
          "description": "Connection/sensor failure, worker restart or backend shutdown ends the interrupted AUTO run. Reconnection only reconciles OFF_PENDING using fresh live OFF feedback; it never resumes ON. Explicit Start is required. MANUAL with OFF_PENDING does not confirm physical OFF. Authenticated read access.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "name": "floorId",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "object",
                        "properties": {
                          "mode": {
                            "type": "string",
                            "enum": [
                              "MANUAL",
                              "AUTO"
                            ]
                          },
                          "run": {
                            "type": "object",
                            "nullable": true,
                            "properties": {
                              "status": {
                                "type": "string",
                                "enum": [
                                  "RUNNING",
                                  "STOPPED",
                                  "FAULT"
                                ]
                              },
                              "dry_run": {
                                "type": "boolean"
                              },
                              "started_by": {
                                "type": "integer",
                                "nullable": true
                              }
                            }
                          },
                          "runtime": {
                            "type": "object",
                            "properties": {
                              "demand": {
                                "type": "boolean"
                              },
                              "cooling_demand": {
                                "type": "boolean"
                              },
                              "last_reason": {
                                "type": "string",
                                "nullable": true
                              },
                              "control_state": {
                                "type": "string",
                                "enum": [
                                  "DISABLED",
                                  "IDLE",
                                  "ON_REQUESTED",
                                  "MISTING",
                                  "OFF_PENDING",
                                  "COOLDOWN",
                                  "SENSOR_FAULT",
                                  "DEVICE_OFFLINE",
                                  "FAULT"
                                ]
                              },
                              "pulse_started_at": {
                                "type": "string",
                                "format": "date-time",
                                "nullable": true
                              },
                              "pulse_deadline_at": {
                                "type": "string",
                                "format": "date-time",
                                "nullable": true
                              },
                              "last_error": {
                                "type": "string",
                                "nullable": true
                              }
                            }
                          },
                          "environment": {
                            "type": "object",
                            "properties": {
                              "masterId": {
                                "type": "string"
                              },
                              "nodeId": {
                                "type": "integer"
                              },
                              "averageHumidity": {
                                "type": "number",
                                "nullable": true
                              },
                              "averageTemperature": {
                                "type": "number",
                                "nullable": true
                              },
                              "temperatureSpread": {
                                "type": "number",
                                "nullable": true
                              },
                              "healthy": {
                                "type": "boolean"
                              },
                              "reason": {
                                "type": "string",
                                "nullable": true
                              },
                              "sensors": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "sensorId": {
                                      "type": "integer"
                                    },
                                    "humidity": {
                                      "type": "number",
                                      "nullable": true
                                    },
                                    "valid": {
                                      "type": "boolean"
                                    },
                                    "ageMs": {
                                      "type": "number",
                                      "nullable": true
                                    },
                                    "retained": {
                                      "type": "boolean"
                                    }
                                  }
                                }
                              },
                              "thresholds": {
                                "type": "object",
                                "additionalProperties": false,
                                "required": [
                                  "humidity_min",
                                  "humidity_max",
                                  "humidity_start_threshold",
                                  "humidity_stop_threshold",
                                  "misting_pulse_ms",
                                  "cooldown_ms",
                                  "evaluation_interval_ms",
                                  "max_sensor_spread_percent",
                                  "max_activations_per_hour",
                                  "max_cumulative_on_ms_per_hour"
                                ],
                                "properties": {
                                  "mushroom_type_id": {
                                    "type": "integer",
                                    "minimum": 1,
                                    "maximum": 2147483647
                                  },
                                  "humidity_min": {
                                    "type": "number",
                                    "minimum": 0,
                                    "maximum": 100
                                  },
                                  "humidity_max": {
                                    "type": "number",
                                    "minimum": 0,
                                    "maximum": 100
                                  },
                                  "humidity_start_threshold": {
                                    "type": "number",
                                    "minimum": 0,
                                    "maximum": 100
                                  },
                                  "humidity_stop_threshold": {
                                    "type": "number",
                                    "minimum": 0,
                                    "maximum": 100
                                  },
                                  "misting_pulse_ms": {
                                    "type": "integer",
                                    "minimum": 1000,
                                    "maximum": 60000
                                  },
                                  "cooldown_ms": {
                                    "type": "integer",
                                    "minimum": 1000,
                                    "maximum": 86400000
                                  },
                                  "evaluation_interval_ms": {
                                    "type": "integer",
                                    "minimum": 1000,
                                    "maximum": 60000
                                  },
                                  "sensor_max_age_ms": {
                                    "type": "integer",
                                    "minimum": 1000,
                                    "maximum": 300000
                                  },
                                  "required_valid_sensors": {
                                    "type": "integer",
                                    "minimum": 1,
                                    "maximum": 3
                                  },
                                  "max_sensor_spread_percent": {
                                    "type": "number",
                                    "minimum": 0,
                                    "maximum": 100
                                  },
                                  "max_activations_per_hour": {
                                    "type": "integer",
                                    "minimum": 1,
                                    "maximum": 3600
                                  },
                                  "max_cumulative_on_ms_per_hour": {
                                    "type": "integer",
                                    "minimum": 1000,
                                    "maximum": 3600000
                                  },
                                  "profile_name": {
                                    "type": "string",
                                    "maxLength": 200,
                                    "nullable": true
                                  },
                                  "profile_approved": {
                                    "type": "boolean",
                                    "default": false
                                  },
                                  "mushroom_type_ids": {
                                    "type": "array",
                                    "minItems": 1,
                                    "uniqueItems": true,
                                    "items": {
                                      "type": "integer",
                                      "minimum": 1,
                                      "maximum": 2147483647
                                    },
                                    "description": "FLOOR only: approve crop types before assigning sessions. Server reads conditions and stores source_profiles. Must include all crops currently on the floor."
                                  },
                                  "config_source": {
                                    "type": "string",
                                    "enum": [
                                      "LEGACY",
                                      "FLOOR"
                                    ],
                                    "default": "LEGACY",
                                    "description": "FLOOR derives crop types from assigned tray sessions; requires a reviewed named profile. LEGACY requires mushroom_type_id."
                                  },
                                  "cooling_enabled": {
                                    "type": "boolean",
                                    "default": false,
                                    "description": "When true all temperature fields and cooling_humidity_limit are required."
                                  },
                                  "temperature_min": {
                                    "type": "number",
                                    "minimum": -40,
                                    "maximum": 80
                                  },
                                  "temperature_max": {
                                    "type": "number",
                                    "minimum": -40,
                                    "maximum": 80
                                  },
                                  "temperature_start_threshold": {
                                    "type": "number",
                                    "minimum": -40,
                                    "maximum": 80
                                  },
                                  "temperature_stop_threshold": {
                                    "type": "number",
                                    "minimum": -40,
                                    "maximum": 80
                                  },
                                  "cooling_humidity_limit": {
                                    "type": "number",
                                    "minimum": 0,
                                    "maximum": 100
                                  },
                                  "max_temperature_spread_c": {
                                    "type": "number",
                                    "minimum": 0,
                                    "maximum": 20
                                  }
                                }
                              }
                            }
                          },
                          "ssr": {
                            "type": "object",
                            "nullable": true,
                            "properties": {
                              "desired_state": {
                                "type": "string",
                                "enum": [
                                  "ON",
                                  "OFF"
                                ],
                                "nullable": true
                              },
                              "reported_state": {
                                "type": "string",
                                "enum": [
                                  "ON",
                                  "OFF"
                                ],
                                "nullable": true
                              }
                            }
                          },
                          "cooldownRemainingMs": {
                            "type": "number"
                          },
                          "lastDecision": {
                            "type": "object",
                            "nullable": true
                          }
                        }
                      }
                    }
                  },
                  "example": {
                    "data": {
                      "mode": "MANUAL",
                      "run": {
                        "status": "STOPPED",
                        "dry_run": true,
                        "started_by": 1
                      },
                      "runtime": {
                        "control_state": "DISABLED",
                        "pulse_deadline_at": null,
                        "last_error": null
                      },
                      "ssr": {
                        "desired_state": "OFF",
                        "reported_state": "OFF"
                      },
                      "cooldownRemainingMs": 0
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid fields, thresholds, ranges or pagination"
            },
            "401": {
              "description": "JWT missing or invalid"
            },
            "403": {
              "description": "Missing automation permission"
            },
            "404": {
              "description": "Floor not found"
            },
            "409": {
              "description": "Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed"
            },
            "503": {
              "description": "MQTT unavailable; OFF remains pending and is retried"
            }
          }
        }
      },
      "/api/iot/floors/{floorId}/auto-control/logs": {
        "get": {
          "tags": [
            "Automatic misting"
          ],
          "summary": "Read paginated decision history",
          "description": " Authenticated read access.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "name": "floorId",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            },
            {
              "name": "limit",
              "in": "query",
              "schema": {
                "type": "integer",
                "minimum": 1,
                "maximum": 1000
              }
            },
            {
              "name": "offset",
              "in": "query",
              "schema": {
                "type": "integer",
                "minimum": 0,
                "maximum": 1000000
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "object"
                      }
                    }
                  },
                  "example": {
                    "data": {
                      "limit": 100,
                      "offset": 0,
                      "logs": [
                        {
                          "event_type": "CONFIG_SAVED",
                          "reason": "Đã lưu cấu hình; vẫn duy trì chế độ thủ công (MANUAL)"
                        }
                      ]
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid fields, thresholds, ranges or pagination"
            },
            "401": {
              "description": "JWT missing or invalid"
            },
            "403": {
              "description": "Missing automation permission"
            },
            "404": {
              "description": "Floor not found"
            },
            "409": {
              "description": "Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed"
            },
            "503": {
              "description": "MQTT unavailable; OFF remains pending and is retried"
            }
          }
        }
      },
      "/api/iot/floors/{floorId}/auto-control/evaluate": {
        "post": {
          "tags": [
            "Automatic misting"
          ],
          "summary": "Preview current algorithm decision without side effects",
          "description": "Does not start AUTO, update runtime or publish MQTT. MANUAL yields NONE. Use a dry run Start to simulate pulses. Requires iot.automation.manage permission.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "name": "floorId",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer",
                "minimum": 1
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision.",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "object"
                      }
                    }
                  },
                  "example": {
                    "data": {
                      "dryRun": true,
                      "decision": {
                        "action": "NONE",
                        "state": "DISABLED",
                        "reason": "Chế độ thủ công (MANUAL)"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid fields, thresholds, ranges or pagination"
            },
            "401": {
              "description": "JWT missing or invalid"
            },
            "403": {
              "description": "Missing automation permission"
            },
            "404": {
              "description": "Floor not found"
            },
            "409": {
              "description": "Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed"
            },
            "503": {
              "description": "MQTT unavailable; OFF remains pending and is retried"
            }
          }
        }
      }
    }
  },
  "customOptions": {}
};
  url = options.swaggerUrl || url
  var urls = options.swaggerUrls
  var customOptions = options.customOptions
  var spec1 = options.swaggerDoc
  var swaggerOptions = {
    spec: spec1,
    url: url,
    urls: urls,
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    plugins: [
      SwaggerUIBundle.plugins.DownloadUrl
    ],
    layout: "StandaloneLayout"
  }
  for (var attrname in customOptions) {
    swaggerOptions[attrname] = customOptions[attrname];
  }
  var ui = SwaggerUIBundle(swaggerOptions)

  if (customOptions.oauth) {
    ui.initOAuth(customOptions.oauth)
  }

  if (customOptions.preauthorizeApiKey) {
    const key = customOptions.preauthorizeApiKey.authDefinitionKey;
    const value = customOptions.preauthorizeApiKey.apiKeyValue;
    if (!!key && !!value) {
      const pid = setInterval(() => {
        const authorized = ui.preauthorizeApiKey(key, value);
        if(!!authorized) clearInterval(pid);
      }, 500)

    }
  }

  if (customOptions.authAction) {
    ui.authActions.authorize(customOptions.authAction)
  }

  window.ui = ui
}
