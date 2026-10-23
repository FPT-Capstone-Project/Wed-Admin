
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
        "url": "https://backend-75e1.onrender.com",
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
        "description": "Customer orders for rental packages and mushroom types"
      },
      {
        "name": "Rentals",
        "description": "Rental records created after successful payment and managed by Admin/Farm Operator"
      },
      {
        "name": "Payments",
        "description": "PayOS checkout payments for customer orders"
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
              "description": "Optional; role IDs in the current seed: 1 = Farm Operator, 2 = Admin, 3 = Customer. Without roleId, Customer (3) is assigned."
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
        "CreateRentalOrderRequest": {
          "type": "object",
          "required": [
            "mushroomTypeId"
          ],
          "properties": {
            "packageId": {
              "type": "integer",
              "nullable": true,
              "example": 1,
              "description": "Optional rental package ID. When provided, the order has one RENTAL item containing both this package and mushroomTypeId."
            },
            "mushroomTypeId": {
              "type": "integer",
              "example": 2,
              "description": "Required mushroom type ID. Without packageId, creates one MUSHROOM order item."
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
                  "description": "Becomes CONFIRMED after a successful PayOS payment.",
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
            "co2_min": {
              "type": "number",
              "nullable": true,
              "example": 350
            },
            "co2_max": {
              "type": "number",
              "nullable": true,
              "example": 500
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
            },
            "co2Min": {
              "type": "number",
              "nullable": true,
              "example": 350
            },
            "co2Max": {
              "type": "number",
              "nullable": true,
              "example": 500
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
            },
            "co2Min": {
              "type": "number",
              "nullable": true,
              "example": 300
            },
            "co2Max": {
              "type": "number",
              "nullable": true,
              "example": 600
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
              "description": "Package is referenced by an order or rental"
            }
          }
        }
      },
      "/api/rentals/admin": {
        "get": {
          "tags": [
            "Rentals"
          ],
          "summary": "List rentals managed by admin or farm operator",
          "description": "Lists rental records created after successful payments. Status values are CONFIRMED, PREPARING, ACTIVE, COMPLETED, and CANCELLED. Role IDs 1 and 2 are allowed.",
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
                  "CONFIRMED",
                  "PREPARING",
                  "ACTIVE",
                  "COMPLETED",
                  "CANCELLED"
                ]
              }
            },
            {
              "in": "query",
              "name": "userId",
              "schema": {
                "type": "integer"
              }
            },
            {
              "in": "query",
              "name": "packageId",
              "schema": {
                "type": "integer"
              }
            },
            {
              "in": "query",
              "name": "trayId",
              "schema": {
                "type": "integer"
              }
            },
            {
              "in": "query",
              "name": "startDateFrom",
              "schema": {
                "type": "string",
                "format": "date-time"
              }
            },
            {
              "in": "query",
              "name": "startDateTo",
              "schema": {
                "type": "string",
                "format": "date-time"
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
              "description": "Rental list with pagination"
            },
            "400": {
              "description": "Invalid filter"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Only Admin and Farm Operator roles are allowed"
            }
          }
        }
      },
      "/api/rentals/admin/from-order": {
        "post": {
          "tags": [
            "Rentals"
          ],
          "summary": "Manually create a rental from a paid rental order",
          "description": "Creates a CONFIRMED rental if the payment webhook did not create one. The order must contain a rental package. The operation is idempotent; an existing rental is returned unchanged. Role IDs 1 and 2 are allowed.",
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
                    "orderId"
                  ],
                  "properties": {
                    "orderId": {
                      "type": "integer",
                      "example": 15
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Rental already exists for this order"
            },
            "201": {
              "description": "Rental created"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Only Admin and Farm Operator roles are allowed"
            },
            "404": {
              "description": "Paid rental order not found"
            },
            "409": {
              "description": "Order has not been paid or has been cancelled"
            }
          }
        }
      },
      "/api/rentals/admin/{rentalId}/cultivation-session": {
        "post": {
          "tags": [
            "Rentals"
          ],
          "summary": "Start cultivation for a paid rental",
          "description": "Selects the mushroom type from the rental order, creates an ACTIVE cultivation session and initial PREPARATION progress, assigns the tray, starts the rental period, marks the tray OCCUPIED, and changes a CONFIRMED order to PROCESSING. Role IDs 1 and 2 are allowed.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "rentalId",
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
                    "trayId"
                  ],
                  "properties": {
                    "trayId": {
                      "type": "integer",
                      "example": 8
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Cultivation session created and rental started"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Only Admin and Farm Operator roles are allowed"
            },
            "404": {
              "description": "Rental or cultivation tray not found"
            },
            "409": {
              "description": "Rental is not paid or ready, tray is unavailable, session already exists, or no active mushroom is associated with the rental"
            }
          }
        }
      },
      "/api/rentals/admin/{rentalId}/progress": {
        "post": {
          "tags": [
            "Rentals"
          ],
          "summary": "Record cultivation progress for an active rental",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "rentalId",
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
                    "currentStage",
                    "progressPercent"
                  ],
                  "properties": {
                    "currentStage": {
                      "type": "string",
                      "enum": [
                        "PREPARATION",
                        "INCUBATION",
                        "PINNING",
                        "FRUITING",
                        "HARVEST"
                      ]
                    },
                    "progressPercent": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "description": {
                      "type": "string",
                      "maxLength": 1000
                    }
                  }
                },
                "example": {
                  "currentStage": "PINNING",
                  "progressPercent": 60,
                  "description": "Pinheads have appeared."
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Progress recorded"
            },
            "400": {
              "description": "Invalid progress data"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Only Admin and Farm Operator roles are allowed"
            },
            "404": {
              "description": "Rental not found"
            },
            "409": {
              "description": "Rental or session is not active, or progress moves backwards"
            }
          }
        }
      },
      "/api/rentals/admin/{rentalId}/harvests": {
        "post": {
          "tags": [
            "Rentals"
          ],
          "summary": "Record a harvest for an active rental",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "rentalId",
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
                    "quantity",
                    "unit"
                  ],
                  "properties": {
                    "quantity": {
                      "type": "number",
                      "exclusiveMinimum": 0
                    },
                    "unit": {
                      "type": "string",
                      "maxLength": 20
                    },
                    "qualityGrade": {
                      "type": "string",
                      "maxLength": 20
                    },
                    "notes": {
                      "type": "string",
                      "maxLength": 1000
                    },
                    "harvestDate": {
                      "type": "string",
                      "format": "date"
                    }
                  }
                },
                "example": {
                  "quantity": 1.5,
                  "unit": "kg",
                  "qualityGrade": "A",
                  "notes": "First harvest",
                  "harvestDate": "2026-10-20"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Harvest recorded"
            },
            "400": {
              "description": "Invalid harvest data"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Only Admin and Farm Operator roles are allowed"
            },
            "404": {
              "description": "Rental not found"
            },
            "409": {
              "description": "Rental or session is not active, or the current stage is not HARVEST"
            }
          }
        }
      },
      "/api/rentals/admin/{rentalId}/complete": {
        "post": {
          "tags": [
            "Rentals"
          ],
          "summary": "Complete an active rental after harvest",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "rentalId",
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
                    "note": {
                      "type": "string",
                      "maxLength": 1000
                    }
                  }
                },
                "example": {
                  "note": "Final harvest collected."
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Rental completed"
            },
            "400": {
              "description": "Invalid completion data"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Only Admin and Farm Operator roles are allowed"
            },
            "404": {
              "description": "Rental not found"
            },
            "409": {
              "description": "Rental or session is not active, there is no harvest, or the order is cancelled"
            }
          }
        }
      },
      "/api/rentals/admin/{rentalId}/cancel": {
        "post": {
          "tags": [
            "Rentals"
          ],
          "summary": "Cancel a rental and mark a paid order for manual refund",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "rentalId",
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
                    "reason"
                  ],
                  "properties": {
                    "reason": {
                      "type": "string",
                      "minLength": 3,
                      "maxLength": 500
                    }
                  }
                },
                "example": {
                  "reason": "Customer requested cancellation."
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Rental cancelled"
            },
            "400": {
              "description": "Invalid cancellation reason"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Only Admin role is allowed"
            },
            "404": {
              "description": "Rental not found"
            },
            "409": {
              "description": "Rental cannot be cancelled in its current status"
            }
          }
        }
      },
      "/api/rentals/admin/{rentalId}": {
        "get": {
          "tags": [
            "Rentals"
          ],
          "summary": "Get a rental record with customer, order, package, tray and room details",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "rentalId",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Rental detail"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Only Admin and Farm Operator roles are allowed"
            },
            "404": {
              "description": "Rental not found"
            }
          }
        },
        "patch": {
          "tags": [
            "Rentals"
          ],
          "summary": "Update rental details or approve a confirmed rental",
          "description": "PATCH only supports the CONFIRMED to PREPARING status transition. Start cultivation, complete, and cancel use their dedicated POST endpoints.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "rentalId",
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
                    "status": {
                      "type": "string",
                      "enum": [
                        "PREPARING"
                      ]
                    },
                    "trayId": {
                      "type": "integer",
                      "nullable": true,
                      "description": "Set null to unassign a tray."
                    },
                    "durationDays": {
                      "type": "integer",
                      "minimum": 1,
                      "description": "Rental duration in days."
                    },
                    "startDate": {
                      "type": "string",
                      "format": "date-time",
                      "nullable": true,
                      "description": "Set null to clear the start timestamp."
                    },
                    "endDate": {
                      "type": "string",
                      "format": "date-time",
                      "nullable": true,
                      "description": "Set null to clear the end timestamp."
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Rental updated"
            },
            "400": {
              "description": "Invalid fields or rental date range"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "Only Admin and Farm Operator roles are allowed"
            },
            "404": {
              "description": "Rental or available tray not found"
            },
            "409": {
              "description": "Invalid status transition or tray date conflict"
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
      "/api/payments/orders/{orderId}/payos": {
        "post": {
          "tags": [
            "Payments"
          ],
          "summary": "Create or reuse a PayOS payment link for an order",
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
              "description": "Customer order list"
            },
            "401": {
              "description": "Missing or invalid JWT token"
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
      "/api/orders/rentals": {
        "post": {
          "tags": [
            "Orders"
          ],
          "summary": "Create an order for a mushroom, optionally with a rental package",
          "description": "The authenticated customer is assigned as the order owner. When packageId is provided, one RENTAL order item stores both the rental package and mushroom type, and mushroom growing time must not exceed package duration. Without packageId, one MUSHROOM order item is created.",
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
                  "$ref": "#/components/schemas/CreateRentalOrderRequest"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Order and a single MUSHROOM or RENTAL order item created"
            },
            "400": {
              "description": "Invalid selection or mushroom growing time exceeds the rental duration"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "404": {
              "description": "Rental package or mushroom type not found"
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
          "description": "The camera's camera_code must contain its Imou cloud device ID. Access is limited to administrators and farm operators.",
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
            }
          ],
          "responses": {
            "200": {
              "description": "Temporary stream information returned by Imou"
            },
            "401": {
              "description": "Missing or invalid JWT token"
            },
            "403": {
              "description": "User is not an administrator or farm operator"
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
      "/api/auth/google": {
        "get": {
          "tags": [
            "Auth OTP"
          ],
          "summary": "Start Gmail API authorization for the OTP sender account",
          "responses": {
            "302": {
              "description": "Redirect to Google consent screen"
            },
            "429": {
              "description": "Rate limit exceeded"
            }
          }
        }
      },
      "/api/auth/google/callback": {
        "get": {
          "tags": [
            "Auth OTP"
          ],
          "summary": "Complete Gmail API authorization and return a refresh token",
          "responses": {
            "200": {
              "description": "OAuth complete; copy the refresh token to secret environment variables"
            },
            "400": {
              "description": "Authorization denied",
              "expired state": null,
              "or no refresh token": null
            },
            "429": {
              "description": "Rate limit exceeded"
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
                    }
                  }
                }
              }
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
          "description": " Requires iot.automation.manage permission.",
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
          "description": "Requires iot.automation.manage. Uses ACTIVE tray sessions linked to ACTIVE rentals on the same tray; returns sourceProfiles, common, issues, warnings, config. Config is null for missing, conflicting or too narrow conditions. No database writes or device commands. Review preset, set profile_approved=true and PUT config to auto-control. Authenticated read access.",
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
              "description": "OFF publication timed out or no new live OFF feedback within 5 seconds after publication; AUTO was not started"
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
                          "reason": "Configuration saved; MANUAL remains active"
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
                        "reason": "MANUAL mode"
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
