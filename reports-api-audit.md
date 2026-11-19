
## /api/rental-packages
GET {
            parameters: {
                query?: {
                    status?: "ACTIVE" | "INACTIVE";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Rental package list */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing or invalid JWT token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }
POST {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CreateRentalPackageRequest"];
                };
            };
            responses: {
                /** @description Rental package created successfully */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation failed */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/rental-packages/{id}
GET {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Rental package detail */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rental package not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }
PUT {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["UpdateRentalPackageRequest"];
                };
            };
            responses: {
                /** @description Rental package updated successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation failed */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rental package not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }
DELETE {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Rental package deleted successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rental package not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Package is referenced by an order and cannot be deleted */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/payments/orders/{orderId}/status
GET {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    orderId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Current order and payment status */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaymentStatusResponse"];
                    };
                };
                /** @description Missing or invalid JWT token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Order or payment not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/payments/orders/{orderId}/payos/sync
POST {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    orderId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Current local payment state after synchronization */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing or invalid JWT token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Order or payment not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Payment could not be synchronized */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description PayOS could not confirm the payment */
                502: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description PayOS is not configured */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/payments/orders/{orderId}/payos
POST {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    orderId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description PayOS payment link created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PayosPaymentResponse"];
                    };
                };
                /** @description Missing or invalid JWT token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Order not found for this customer */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Order cannot be paid */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description PayOS payment link could not be created */
                502: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description PayOS is not configured */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/payments/payos/webhook
GET {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Webhook URL is reachable */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }
POST {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @example 00 */
                        code: string;
                        /** @example success */
                        desc?: string;
                        /** @example true */
                        success: boolean;
                        data: {
                            /** @example 34 */
                            orderCode?: number;
                            /** @example 530000 */
                            amount?: number;
                            /** @example TF230204212323 */
                            reference?: string;
                            /** @example 00 */
                            code?: string;
                        };
                        signature: string;
                    };
                };
            };
            responses: {
                /** @description Webhook received */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/orders
GET {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Customer order list */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: {
                                order_id?: number;
                                user_id?: number;
                                subtotal?: string;
                                discount?: string;
                                shipping_fee?: string;
                                total_amount?: string;
                                status?: string;
                                /** @description Current orders.payment_status */
                                payment_status?: string;
                                /** Format: date-time */
                                created_at?: string;
                                /** Format: date-time */
                                updated_at?: string;
                                package_name?: string | null;
                                mushroom_name?: string | null;
                                total_price?: string | null;
                            }[];
                        };
                    };
                };
                /** @description Missing or invalid JWT token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/orders/admin
GET {
            parameters: {
                query?: {
                    page?: number;
                    pageSize?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Customer orders with pagination, newest first with order ID as tie breaker */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: {
                                order_id?: number;
                                customer_id?: number;
                                customer_name?: string | null;
                                customer_email?: string | null;
                                package_name?: string | null;
                                mushroom_name?: string | null;
                                /** @description Sum of item quantities */
                                quantity?: number | null;
                                total_price?: string | null;
                                subtotal?: string;
                                discount?: string;
                                shipping_fee?: string;
                                total_amount?: string;
                                status?: string;
                                payment_status?: string;
                                /** Format: date-time */
                                created_at?: string;
                                /** Format: date-time */
                                updated_at?: string;
                            }[];
                            pagination?: {
                                page?: number;
                                pageSize?: number;
                                total?: number;
                                totalPages?: number;
                            };
                        };
                    };
                };
                /** @description Invalid pagination */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing or invalid JWT token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Admin or Farm Operator role required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/orders/{orderId}/cancel
PATCH {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    orderId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Order cancelled successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing or invalid JWT token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Order not found for this customer */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Order is not eligible for cancellation */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/orders/{orderId}/harvest-history
GET {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    orderId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Order harvest history */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid order ID */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing or invalid JWT token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Admin or Farm Operator role required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Order not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/orders/{orderId}
GET {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    orderId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Order details including its items */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing or invalid JWT token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Order not found for this customer */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/orders/cultivation
POST {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CreateCultivationOrderRequest"];
                };
            };
            responses: {
                /** @description Order and cultivation order item created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid selection or mushroom growing time exceeds the selected package duration */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing or invalid JWT token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Package or mushroom type not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Insufficient cultivation capacity (`INSUFFICIENT_TRAYS` or `INSUFFICIENT_SPAWN`) */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/mushroom-types
GET {
            parameters: {
                query?: {
                    /** @description Filter by status */
                    status?: "ACTIVE" | "INACTIVE";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description List of mushroom types */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: components["schemas"]["MushroomType"][];
                        };
                    };
                };
                /** @description Missing or invalid JWT token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }
POST {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "multipart/form-data": {
                        /** @example King Oyster */
                        name: string;
                        /** @example Mushroom type for soups and hotpot */
                        description?: string;
                        /** @example 25 */
                        growingDays: number;
                        /** @example 120000 */
                        price: number;
                        /**
                         * @example ACTIVE
                         * @enum {string}
                         */
                        status?: "ACTIVE" | "INACTIVE";
                        /** Format: binary */
                        image?: string;
                    };
                };
            };
            responses: {
                /** @description Mushroom type created successfully */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            message?: string;
                            data?: components["schemas"]["MushroomType"];
                        };
                    };
                };
                /** @description Validation failed */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing or invalid JWT token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Mushroom type name already exists */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/mushroom-types/{id}
GET {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Mushroom type id */
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Mushroom type detail */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: components["schemas"]["MushroomType"];
                        };
                    };
                };
                /** @description Missing or invalid JWT token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Mushroom type not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }
PUT {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "multipart/form-data": {
                        /** @example King Oyster Premium */
                        name?: string;
                        /** @example Updated description */
                        description?: string;
                        /** @example 30 */
                        growingDays?: number;
                        /** @example 150000 */
                        price?: number;
                        /**
                         * @example INACTIVE
                         * @enum {string}
                         */
                        status?: "ACTIVE" | "INACTIVE";
                        /** Format: binary */
                        image?: string;
                    };
                };
            };
            responses: {
                /** @description Mushroom type updated successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            message?: string;
                            data?: components["schemas"]["MushroomType"];
                        };
                    };
                };
                /** @description Validation failed */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing or invalid JWT token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Mushroom type not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }
DELETE {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Mushroom type deleted successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            message?: string;
                            data?: components["schemas"]["MushroomType"];
                        };
                    };
                };
                /** @description Missing or invalid JWT token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Mushroom type not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/farm/sessions
GET {
            parameters: {
                query?: {
                    status?: "PENDING" | "SPAWN_RESTING" | "MYCELIAL_DEVELOPMENT" | "READY_FOR_CULTIVATION" | "CULTIVATING" | "HARVEST_READY" | "HARVESTING" | "COMPLETED" | "CANCELLED";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Sessions with spawn and tray quantities */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Admin or Farm Operator role required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/farm/sessions/{id}/spawn-inspections
GET {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Inspection history, including uploaded image metadata */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Session not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }
POST {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        totalChecked: number;
                        normalQuantity: number;
                        warningQuantity: number;
                        abnormalQuantity: number;
                        /** @enum {string} */
                        condition: "NORMAL" | "WARNING" | "ABNORMAL";
                        replacementQuantity?: number;
                        notes?: string;
                        /** Format: date-time */
                        nextCheckAt?: string;
                    };
                };
            };
            responses: {
                /** @description Inspection saved; replacement stock is deducted transactionally */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Session is not in an inspectable stage, already has a spawn inspection today, or replacement stock is insufficient */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/farm/sessions/{id}/spawn-inspections/{inspectionId}
PUT {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                    inspectionId: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        totalChecked: number;
                        normalQuantity: number;
                        warningQuantity: number;
                        abnormalQuantity: number;
                        /** @enum {string} */
                        condition: "NORMAL" | "WARNING" | "ABNORMAL";
                        replacementQuantity: number;
                        notes?: string;
                        /** Format: date-time */
                        nextCheckAt?: string;
                    };
                };
            };
            responses: {
                /** @description Spawn inspection updated */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid inspection data */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Session or inspection not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Session is not paid or inventory update failed */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/farm/sessions/{id}/stage
PATCH {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @enum {string} */
                        stage: "SPAWN_RESTING" | "MYCELIAL_DEVELOPMENT" | "READY_FOR_CULTIVATION";
                    };
                };
            };
            responses: {
                /** @description Spawn phase updated successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid stage or session ID */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing or invalid JWT token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Admin or Farm Operator role required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Session not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Stage transition requirements are not met */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/cultivation-trays/{id}/complete-sanitation
POST {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Tray ready; confirmation recorded */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Authentication required */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Staff role required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Tray not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Tray not in maintenance or active assignment exists */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/cultivation-trays
GET {
            parameters: {
                query?: {
                    roomId?: number;
                    floorId?: number;
                    status?: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "INACTIVE";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Cultivation tray list */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }
POST {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CreateCultivationTrayRequest"];
                };
            };
            responses: {
                /** @description Cultivation tray created successfully */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Cultivation room not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Tray code already exists */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/cultivation-trays/{id}
GET {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Cultivation tray detail */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Cultivation tray not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }
PUT {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["UpdateCultivationTrayRequest"];
                };
            };
            responses: {
                /** @description Cultivation tray updated successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Tray or room not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }
DELETE {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Cultivation tray deleted successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Tray is used by a cultivation session */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/orders/{orderId}/complaints
POST {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    orderId: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        complaintType: string;
                        description: string;
                        imageUrls?: string[];
                    };
                };
            };
            responses: {
                /** @description Complaint created with OPEN status */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid content or image URLs */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Order not found or not owned */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Ineligible shipment or duplicate complaint */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/analytics/dashboard
GET {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Dashboard metrics (quality rates are percentages) */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                revenue: {
                                    /** @example 128500000 */
                                    value: number;
                                    /** @enum {string} */
                                    currency: "VND";
                                };
                                /** @example 36 */
                                trays_used: number;
                                harvest_quality: {
                                    /**
                                     * @description Percentage of total harvested weight that is usable
                                     * @example 93
                                     */
                                    usable_rate: number;
                                    /**
                                     * @description Percentage of total harvested weight that is rejected
                                     * @example 7
                                     */
                                    waste_rate: number;
                                };
                            };
                        };
                    };
                };
                /** @description Missing or invalid JWT token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Admin or Farm Operator role required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/analytics/dashboard/environment-history
GET {
            parameters: {
                query?: {
                    from?: string;
                    to?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Chart points ordered by time; floors ordered by room and floor number */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: {
                                /** @description Epoch milliseconds */
                                from?: number;
                                /** @description Exclusive end in epoch milliseconds */
                                to?: number;
                                /** @example 900000 */
                                bucketMs?: number;
                                /** @example 300000 */
                                refreshAfterMs?: number;
                                floors?: {
                                    floorId?: number;
                                    floorName?: string;
                                    floorNumber?: number;
                                    roomId?: number;
                                    masterDbId?: number;
                                    masterId?: string;
                                    nodeId?: number;
                                    thresholds?: {
                                        temperature_min?: number | null;
                                        temperature_max?: number | null;
                                        humidity_min?: number | null;
                                        humidity_max?: number | null;
                                    };
                                    points?: {
                                        /** @description Bucket start in epoch milliseconds */
                                        timestamp?: number;
                                        /** @description Degrees Celsius */
                                        temperature?: number | null;
                                        /** @description Relative humidity percent */
                                        humidity?: number | null;
                                    }[];
                                }[];
                            };
                        };
                    };
                };
                /** @description Invalid time range */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing or invalid JWT */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Admin or Farm Operator only */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/iot/masters
GET {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: components["schemas"]["IotMaster"][];
                        };
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Missing or invalid JWT */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Resource not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Database or server error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        }

## /api/iot/masters/{masterId}/sensors
GET {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    masterId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: components["schemas"]["IotSensors"];
                        };
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Missing or invalid JWT */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Resource not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Database or server error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        }

## /api/iot/masters/{masterId}/nodes/{nodeId}/sensors/{sensorId}
GET {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    masterId: string;
                    nodeId: number;
                    sensorId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: components["schemas"]["IotSensor"];
                        };
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Missing or invalid JWT */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Resource not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Database or server error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        }

## /api/iot/masters/{masterId}/nodes/{nodeId}/sensors/{sensorId}/history
GET {
            parameters: {
                query?: {
                    from?: string;
                    to?: string;
                    limit?: number;
                    offset?: number;
                };
                header?: never;
                path: {
                    masterId: string;
                    nodeId: number;
                    sensorId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: components["schemas"]["IotHistory"];
                        };
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Missing or invalid JWT */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Resource not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Database or server error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        }

## /api/iot/masters/{masterId}/ssr
GET {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    masterId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: components["schemas"]["IotSsr"];
                        };
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Missing or invalid JWT */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Resource not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Database or server error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        }

## /api/iot/masters/{masterId}/ssr/{channel}/commands
POST {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    masterId: string;
                    channel: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    /**
                     * @example {
                     *       "action": "ON"
                     *     }
                     */
                    "application/json": {
                        /** @enum {string} */
                        action: "ON" | "OFF";
                    };
                };
            };
            responses: {
                /** @description Broker accepted publication; physical state is unverified */
                202: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: components["schemas"]["IotCommand"];
                        };
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Missing or invalid JWT */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Resource not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Channel publication in progress */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Database or server error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description MQTT unavailable or publication failed */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Publication deadline elapsed; delivery unknown */
                504: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        }

## /api/iot/commands/{commandId}
GET {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    commandId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: components["schemas"]["IotCommand"];
                        };
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Missing or invalid JWT */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Resource not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Database or server error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        }

## /api/iot/masters/{masterId}/light
PUT {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    masterId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    /**
                     * @example {
                     *       "channel": 3
                     *     }
                     */
                    "application/json": {
                        channel: number | null;
                    };
                };
            };
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: components["schemas"]["IotMaster"];
                        };
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Missing or invalid JWT */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Missing iot.automation.manage permission */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Resource not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Master has no room or channel is assigned to a floor valve */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Database or server error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        }

## /api/iot/floors/{floorId}/fan
PUT {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    floorId: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    /**
                     * @example {
                     *       "channel": 4
                     *     }
                     */
                    "application/json": {
                        channel: number | null;
                    };
                };
            };
            responses: {
                /** @description Updated floor in data, including nullable fan_ssr_channel */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid floor ID or channel */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Authentication required */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing iot.automation.manage permission */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Floor not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Channel already assigned */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/iot/floors
GET {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: {
                                room_id: number;
                                floor_number: number;
                                floor_name: string;
                                master_id: number;
                                node_address: number;
                                misting_ssr_channel: number;
                                /** @enum {string} */
                                status?: "ACTIVE" | "INACTIVE";
                                total_rows?: number | null;
                                total_columns?: number | null;
                            }[];
                        };
                    };
                };
                /** @description Invalid fields, thresholds, ranges or pagination */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description JWT missing or invalid */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing automation permission */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Floor not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description MQTT unavailable; OFF remains pending and is retried */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }
POST {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        room_id: number;
                        floor_number: number;
                        floor_name: string;
                        master_id: number;
                        node_address: number;
                        misting_ssr_channel: number;
                        /** @enum {string} */
                        status?: "ACTIVE" | "INACTIVE";
                        total_rows?: number | null;
                        total_columns?: number | null;
                    };
                };
            };
            responses: {
                /** @description Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: Record<string, never>;
                        };
                    };
                };
                /** @description Invalid fields, thresholds, ranges or pagination */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description JWT missing or invalid */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing automation permission */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Floor not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description MQTT unavailable; OFF remains pending and is retried */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/iot/floors/{floorId}
PUT {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    floorId: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        room_id: number;
                        floor_number: number;
                        floor_name: string;
                        master_id: number;
                        node_address: number;
                        misting_ssr_channel: number;
                        /** @enum {string} */
                        status?: "ACTIVE" | "INACTIVE";
                        total_rows?: number | null;
                        total_columns?: number | null;
                    };
                };
            };
            responses: {
                /** @description Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: Record<string, never>;
                        };
                    };
                };
                /** @description Invalid fields, thresholds, ranges or pagination */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description JWT missing or invalid */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing automation permission */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Floor not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description MQTT unavailable; OFF remains pending and is retried */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/iot/floors/{floorId}/trays/generate
POST {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    floorId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: Record<string, never>;
                        };
                    };
                };
                /** @description Invalid fields, thresholds, ranges or pagination */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description JWT missing or invalid */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing automation permission */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Floor not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description MQTT unavailable; OFF remains pending and is retried */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/iot/floors/{floorId}/trays
DELETE {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    floorId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: Record<string, never>;
                        };
                    };
                };
                /** @description Invalid fields, thresholds, ranges or pagination */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description JWT missing or invalid */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing automation permission */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Floor not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description MQTT unavailable; OFF remains pending and is retried */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/iot/floors/{floorId}/trays/{trayId}
PUT {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    floorId: number;
                    trayId: number;
                };
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": {
                        position_id?: number | null;
                    };
                };
            };
            responses: {
                /** @description Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: Record<string, never>;
                        };
                    };
                };
                /** @description Invalid fields, thresholds, ranges or pagination */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description JWT missing or invalid */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing automation permission */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Floor not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description MQTT unavailable; OFF remains pending and is retried */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/iot/floors/{floorId}/environment
GET {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    floorId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "data": {
                         *         "masterId": "master01",
                         *         "nodeId": 7,
                         *         "averageHumidity": 84,
                         *         "averageTemperature": 26,
                         *         "healthy": true,
                         *         "reason": null,
                         *         "sensors": [
                         *           {
                         *             "sensorId": 1,
                         *             "humidity": 82,
                         *             "valid": true,
                         *             "ageMs": 1000
                         *           },
                         *           {
                         *             "sensorId": 2,
                         *             "humidity": 84,
                         *             "valid": true,
                         *             "ageMs": 1000
                         *           },
                         *           {
                         *             "sensorId": 3,
                         *             "humidity": 86,
                         *             "valid": true,
                         *             "ageMs": 1000
                         *           }
                         *         ]
                         *       }
                         *     }
                         */
                        "application/json": {
                            data?: {
                                masterId?: string;
                                nodeId?: number;
                                averageHumidity?: number | null;
                                averageTemperature?: number | null;
                                temperatureSpread?: number | null;
                                healthy?: boolean;
                                reason?: string | null;
                                sensors?: {
                                    sensorId?: number;
                                    humidity?: number | null;
                                    valid?: boolean;
                                    ageMs?: number | null;
                                    retained?: boolean;
                                }[];
                                thresholds?: {
                                    mushroom_type_id?: number;
                                    humidity_min: number;
                                    humidity_max: number;
                                    humidity_start_threshold: number;
                                    humidity_stop_threshold: number;
                                    misting_pulse_ms: number;
                                    cooldown_ms: number;
                                    evaluation_interval_ms: number;
                                    sensor_max_age_ms?: number;
                                    required_valid_sensors?: number;
                                    max_sensor_spread_percent: number;
                                    max_activations_per_hour: number;
                                    max_cumulative_on_ms_per_hour: number;
                                    profile_name?: string | null;
                                    /** @default false */
                                    profile_approved: boolean;
                                    /** @description FLOOR only: approve crop types before assigning sessions. Server reads conditions and stores source_profiles. Must include all crops currently on the floor. */
                                    mushroom_type_ids?: number[];
                                    /**
                                     * @description FLOOR derives crop types from assigned tray sessions; requires a reviewed named profile. LEGACY requires mushroom_type_id.
                                     * @default LEGACY
                                     * @enum {string}
                                     */
                                    config_source: "LEGACY" | "FLOOR";
                                    /**
                                     * @description Run fan cycles within the same AUTO run and start/stop controls.
                                     * @default false
                                     */
                                    fan_enabled: boolean;
                                    fan_run_minutes?: number | null;
                                    fan_rest_minutes?: number | null;
                                    /**
                                     * @description When true all temperature fields and cooling_humidity_limit are required.
                                     * @default false
                                     */
                                    cooling_enabled: boolean;
                                    temperature_min?: number;
                                    temperature_max?: number;
                                    temperature_start_threshold?: number;
                                    temperature_stop_threshold?: number;
                                    cooling_humidity_limit?: number;
                                    max_temperature_spread_c?: number;
                                };
                            };
                        };
                    };
                };
                /** @description Invalid fields, thresholds, ranges or pagination */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description JWT missing or invalid */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing automation permission */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Floor not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description MQTT unavailable; OFF remains pending and is retried */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/iot/floors/{floorId}/auto-control
GET {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    floorId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "data": {
                         *         "mode": "MANUAL",
                         *         "config": {
                         *           "mushroom_type_id": 1,
                         *           "humidity_min": 85,
                         *           "humidity_max": 95,
                         *           "humidity_start_threshold": 83,
                         *           "humidity_stop_threshold": 87,
                         *           "misting_pulse_ms": 5000,
                         *           "cooldown_ms": 60000,
                         *           "evaluation_interval_ms": 5000,
                         *           "sensor_max_age_ms": 20000,
                         *           "required_valid_sensors": 3,
                         *           "max_sensor_spread_percent": 10,
                         *           "max_activations_per_hour": 20,
                         *           "max_cumulative_on_ms_per_hour": 100000
                         *         }
                         *       }
                         *     }
                         */
                        "application/json": {
                            data?: Record<string, never>;
                        };
                    };
                };
                /** @description Invalid fields, thresholds, ranges or pagination */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description JWT missing or invalid */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing automation permission */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Floor not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description MQTT unavailable; OFF remains pending and is retried */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }
PUT {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    floorId: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    /**
                     * @example {
                     *       "mushroom_type_id": 1,
                     *       "humidity_min": 85,
                     *       "humidity_max": 95,
                     *       "humidity_start_threshold": 83,
                     *       "humidity_stop_threshold": 87,
                     *       "misting_pulse_ms": 5000,
                     *       "cooldown_ms": 60000,
                     *       "evaluation_interval_ms": 5000,
                     *       "sensor_max_age_ms": 20000,
                     *       "required_valid_sensors": 3,
                     *       "max_sensor_spread_percent": 10,
                     *       "max_activations_per_hour": 20,
                     *       "max_cumulative_on_ms_per_hour": 100000
                     *     }
                     */
                    "application/json": {
                        mushroom_type_id?: number;
                        humidity_min: number;
                        humidity_max: number;
                        humidity_start_threshold: number;
                        humidity_stop_threshold: number;
                        misting_pulse_ms: number;
                        cooldown_ms: number;
                        evaluation_interval_ms: number;
                        sensor_max_age_ms?: number;
                        required_valid_sensors?: number;
                        max_sensor_spread_percent: number;
                        max_activations_per_hour: number;
                        max_cumulative_on_ms_per_hour: number;
                        profile_name?: string | null;
                        /** @default false */
                        profile_approved?: boolean;
                        /** @description FLOOR only: approve crop types before assigning sessions. Server reads conditions and stores source_profiles. Must include all crops currently on the floor. */
                        mushroom_type_ids?: number[];
                        /**
                         * @description FLOOR derives crop types from assigned tray sessions; requires a reviewed named profile. LEGACY requires mushroom_type_id.
                         * @default LEGACY
                         * @enum {string}
                         */
                        config_source?: "LEGACY" | "FLOOR";
                        /**
                         * @description Run fan cycles within the same AUTO run and start/stop controls.
                         * @default false
                         */
                        fan_enabled?: boolean;
                        fan_run_minutes?: number | null;
                        fan_rest_minutes?: number | null;
                        /**
                         * @description When true all temperature fields and cooling_humidity_limit are required.
                         * @default false
                         */
                        cooling_enabled?: boolean;
                        temperature_min?: number;
                        temperature_max?: number;
                        temperature_start_threshold?: number;
                        temperature_stop_threshold?: number;
                        cooling_humidity_limit?: number;
                        max_temperature_spread_c?: number;
                    };
                };
            };
            responses: {
                /** @description Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "data": {
                         *         "mode": "MANUAL",
                         *         "config": {
                         *           "mushroom_type_id": 1,
                         *           "humidity_min": 85,
                         *           "humidity_max": 95,
                         *           "humidity_start_threshold": 83,
                         *           "humidity_stop_threshold": 87,
                         *           "misting_pulse_ms": 5000,
                         *           "cooldown_ms": 60000,
                         *           "evaluation_interval_ms": 5000,
                         *           "sensor_max_age_ms": 20000,
                         *           "required_valid_sensors": 3,
                         *           "max_sensor_spread_percent": 10,
                         *           "max_activations_per_hour": 20,
                         *           "max_cumulative_on_ms_per_hour": 100000
                         *         }
                         *       }
                         *     }
                         */
                        "application/json": {
                            data?: Record<string, never>;
                        };
                    };
                };
                /** @description Invalid fields, thresholds, ranges or pagination */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description JWT missing or invalid */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing automation permission */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Floor not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description MQTT unavailable; OFF remains pending and is retried */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/iot/floors/{floorId}/auto-control/suggestions
GET {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    floorId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: Record<string, never>;
                        };
                    };
                };
                /** @description Invalid fields, thresholds, ranges or pagination */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description JWT missing or invalid */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing automation permission */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Floor not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description MQTT unavailable; OFF remains pending and is retried */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/iot/floors/{floorId}/auto-control/start
POST {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    floorId: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @default true */
                        dryRun?: boolean;
                    };
                };
            };
            responses: {
                /** @description Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "data": {
                         *         "mode": "AUTO",
                         *         "run": {
                         *           "id": 1,
                         *           "status": "RUNNING",
                         *           "dry_run": true,
                         *           "started_by": 1
                         *         }
                         *       }
                         *     }
                         */
                        "application/json": {
                            data?: Record<string, never>;
                        };
                    };
                };
                /** @description Invalid fields, thresholds, ranges or pagination */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description JWT missing or invalid */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing automation permission */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Floor not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description MQTT unavailable; OFF remains pending and is retried */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description OFF hết thời gian gửi lệnh or no new live OFF feedback within 5 seconds after publication; AUTO was not started */
                504: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/iot/floors/{floorId}/auto-control/stop
POST {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    floorId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "data": {
                         *         "mode": "MANUAL",
                         *         "run": {
                         *           "status": "STOPPED",
                         *           "dry_run": true,
                         *           "started_by": 1
                         *         },
                         *         "runtime": {
                         *           "control_state": "DISABLED",
                         *           "pulse_deadline_at": null,
                         *           "last_error": null
                         *         },
                         *         "ssr": {
                         *           "desired_state": "OFF",
                         *           "reported_state": "OFF"
                         *         },
                         *         "cooldownRemainingMs": 0
                         *       }
                         *     }
                         */
                        "application/json": {
                            data?: {
                                fan?: {
                                    /** @enum {string} */
                                    state?: "STOPPED" | "OFF_PENDING" | "READY" | "ON_PENDING" | "RUNNING" | "RESTING";
                                    enabled?: boolean;
                                    channel?: number | null;
                                    runMinutes?: number | null;
                                    restMinutes?: number | null;
                                    remainingMs?: number;
                                    /** Format: date-time */
                                    deadlineAt?: string | null;
                                    lastError?: string | null;
                                };
                                /** @enum {string} */
                                mode?: "MANUAL" | "AUTO";
                                run?: {
                                    /** @enum {string} */
                                    status?: "RUNNING" | "STOPPED" | "FAULT";
                                    dry_run?: boolean;
                                    started_by?: number | null;
                                } | null;
                                /**
                                 * @description AUTO intent stays enabled while waiting for OFF or valid sensors. RUNNING does not mean the valve is ON.
                                 * @enum {string}
                                 */
                                autoStatus?: "RUNNING" | "PAUSED" | "STOPPED";
                                pauseReason?: string | null;
                                runtime?: {
                                    demand?: boolean;
                                    cooling_demand?: boolean;
                                    last_reason?: string | null;
                                    /** @enum {string} */
                                    control_state?: "DISABLED" | "IDLE" | "ON_REQUESTED" | "MISTING" | "OFF_PENDING" | "COOLDOWN" | "SENSOR_FAULT" | "DEVICE_OFFLINE" | "FAULT";
                                    /** Format: date-time */
                                    pulse_started_at?: string | null;
                                    /** Format: date-time */
                                    pulse_deadline_at?: string | null;
                                    last_error?: string | null;
                                };
                                environment?: {
                                    masterId?: string;
                                    nodeId?: number;
                                    averageHumidity?: number | null;
                                    averageTemperature?: number | null;
                                    temperatureSpread?: number | null;
                                    healthy?: boolean;
                                    reason?: string | null;
                                    sensors?: {
                                        sensorId?: number;
                                        humidity?: number | null;
                                        valid?: boolean;
                                        ageMs?: number | null;
                                        retained?: boolean;
                                    }[];
                                    thresholds?: {
                                        mushroom_type_id?: number;
                                        humidity_min: number;
                                        humidity_max: number;
                                        humidity_start_threshold: number;
                                        humidity_stop_threshold: number;
                                        misting_pulse_ms: number;
                                        cooldown_ms: number;
                                        evaluation_interval_ms: number;
                                        sensor_max_age_ms?: number;
                                        required_valid_sensors?: number;
                                        max_sensor_spread_percent: number;
                                        max_activations_per_hour: number;
                                        max_cumulative_on_ms_per_hour: number;
                                        profile_name?: string | null;
                                        /** @default false */
                                        profile_approved: boolean;
                                        /** @description FLOOR only: approve crop types before assigning sessions. Server reads conditions and stores source_profiles. Must include all crops currently on the floor. */
                                        mushroom_type_ids?: number[];
                                        /**
                                         * @description FLOOR derives crop types from assigned tray sessions; requires a reviewed named profile. LEGACY requires mushroom_type_id.
                                         * @default LEGACY
                                         * @enum {string}
                                         */
                                        config_source: "LEGACY" | "FLOOR";
                                        /**
                                         * @description Run fan cycles within the same AUTO run and start/stop controls.
                                         * @default false
                                         */
                                        fan_enabled: boolean;
                                        fan_run_minutes?: number | null;
                                        fan_rest_minutes?: number | null;
                                        /**
                                         * @description When true all temperature fields and cooling_humidity_limit are required.
                                         * @default false
                                         */
                                        cooling_enabled: boolean;
                                        temperature_min?: number;
                                        temperature_max?: number;
                                        temperature_start_threshold?: number;
                                        temperature_stop_threshold?: number;
                                        cooling_humidity_limit?: number;
                                        max_temperature_spread_c?: number;
                                    };
                                };
                                ssr?: {
                                    /** @enum {string|null} */
                                    desired_state?: "ON" | "OFF" | null;
                                    /** @enum {string|null} */
                                    reported_state?: "ON" | "OFF" | null;
                                } | null;
                                cooldownRemainingMs?: number;
                                lastDecision?: Record<string, never> | null;
                            };
                        };
                    };
                };
                /** @description Invalid fields, thresholds, ranges or pagination */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description JWT missing or invalid */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing automation permission */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Floor not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description MQTT unavailable; OFF remains pending and is retried */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/iot/floors/{floorId}/auto-control/status
GET {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    floorId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "data": {
                         *         "mode": "MANUAL",
                         *         "run": {
                         *           "status": "STOPPED",
                         *           "dry_run": true,
                         *           "started_by": 1
                         *         },
                         *         "runtime": {
                         *           "control_state": "DISABLED",
                         *           "pulse_deadline_at": null,
                         *           "last_error": null
                         *         },
                         *         "ssr": {
                         *           "desired_state": "OFF",
                         *           "reported_state": "OFF"
                         *         },
                         *         "cooldownRemainingMs": 0
                         *       }
                         *     }
                         */
                        "application/json": {
                            data?: {
                                fan?: {
                                    /** @enum {string} */
                                    state?: "STOPPED" | "OFF_PENDING" | "READY" | "ON_PENDING" | "RUNNING" | "RESTING";
                                    enabled?: boolean;
                                    channel?: number | null;
                                    runMinutes?: number | null;
                                    restMinutes?: number | null;
                                    remainingMs?: number;
                                    /** Format: date-time */
                                    deadlineAt?: string | null;
                                    lastError?: string | null;
                                };
                                /** @enum {string} */
                                mode?: "MANUAL" | "AUTO";
                                run?: {
                                    /** @enum {string} */
                                    status?: "RUNNING" | "STOPPED" | "FAULT";
                                    dry_run?: boolean;
                                    started_by?: number | null;
                                } | null;
                                /**
                                 * @description AUTO intent stays enabled while waiting for OFF or valid sensors. RUNNING does not mean the valve is ON.
                                 * @enum {string}
                                 */
                                autoStatus?: "RUNNING" | "PAUSED" | "STOPPED";
                                pauseReason?: string | null;
                                runtime?: {
                                    demand?: boolean;
                                    cooling_demand?: boolean;
                                    last_reason?: string | null;
                                    /** @enum {string} */
                                    control_state?: "DISABLED" | "IDLE" | "ON_REQUESTED" | "MISTING" | "OFF_PENDING" | "COOLDOWN" | "SENSOR_FAULT" | "DEVICE_OFFLINE" | "FAULT";
                                    /** Format: date-time */
                                    pulse_started_at?: string | null;
                                    /** Format: date-time */
                                    pulse_deadline_at?: string | null;
                                    last_error?: string | null;
                                };
                                environment?: {
                                    masterId?: string;
                                    nodeId?: number;
                                    averageHumidity?: number | null;
                                    averageTemperature?: number | null;
                                    temperatureSpread?: number | null;
                                    healthy?: boolean;
                                    reason?: string | null;
                                    sensors?: {
                                        sensorId?: number;
                                        humidity?: number | null;
                                        valid?: boolean;
                                        ageMs?: number | null;
                                        retained?: boolean;
                                    }[];
                                    thresholds?: {
                                        mushroom_type_id?: number;
                                        humidity_min: number;
                                        humidity_max: number;
                                        humidity_start_threshold: number;
                                        humidity_stop_threshold: number;
                                        misting_pulse_ms: number;
                                        cooldown_ms: number;
                                        evaluation_interval_ms: number;
                                        sensor_max_age_ms?: number;
                                        required_valid_sensors?: number;
                                        max_sensor_spread_percent: number;
                                        max_activations_per_hour: number;
                                        max_cumulative_on_ms_per_hour: number;
                                        profile_name?: string | null;
                                        /** @default false */
                                        profile_approved: boolean;
                                        /** @description FLOOR only: approve crop types before assigning sessions. Server reads conditions and stores source_profiles. Must include all crops currently on the floor. */
                                        mushroom_type_ids?: number[];
                                        /**
                                         * @description FLOOR derives crop types from assigned tray sessions; requires a reviewed named profile. LEGACY requires mushroom_type_id.
                                         * @default LEGACY
                                         * @enum {string}
                                         */
                                        config_source: "LEGACY" | "FLOOR";
                                        /**
                                         * @description Run fan cycles within the same AUTO run and start/stop controls.
                                         * @default false
                                         */
                                        fan_enabled: boolean;
                                        fan_run_minutes?: number | null;
                                        fan_rest_minutes?: number | null;
                                        /**
                                         * @description When true all temperature fields and cooling_humidity_limit are required.
                                         * @default false
                                         */
                                        cooling_enabled: boolean;
                                        temperature_min?: number;
                                        temperature_max?: number;
                                        temperature_start_threshold?: number;
                                        temperature_stop_threshold?: number;
                                        cooling_humidity_limit?: number;
                                        max_temperature_spread_c?: number;
                                    };
                                };
                                ssr?: {
                                    /** @enum {string|null} */
                                    desired_state?: "ON" | "OFF" | null;
                                    /** @enum {string|null} */
                                    reported_state?: "ON" | "OFF" | null;
                                } | null;
                                cooldownRemainingMs?: number;
                                lastDecision?: Record<string, never> | null;
                            };
                        };
                    };
                };
                /** @description Invalid fields, thresholds, ranges or pagination */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description JWT missing or invalid */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing automation permission */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Floor not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description MQTT unavailable; OFF remains pending and is retried */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/iot/floors/{floorId}/auto-control/logs
GET {
            parameters: {
                query?: {
                    limit?: number;
                    offset?: number;
                };
                header?: never;
                path: {
                    floorId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "data": {
                         *         "limit": 100,
                         *         "offset": 0,
                         *         "logs": [
                         *           {
                         *             "event_type": "CONFIG_SAVED",
                         *             "reason": "Đã lưu cấu hình; vẫn duy trì chế độ thủ công (MANUAL)"
                         *           }
                         *         ]
                         *       }
                         *     }
                         */
                        "application/json": {
                            data?: Record<string, never>;
                        };
                    };
                };
                /** @description Invalid fields, thresholds, ranges or pagination */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description JWT missing or invalid */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing automation permission */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Floor not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description MQTT unavailable; OFF remains pending and is retried */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }

## /api/iot/floors/{floorId}/auto-control/evaluate
POST {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    floorId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Result in {data: ...}. State includes mode, run, runtime, environment, ssr, cooldownRemainingMs and lastDecision. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "data": {
                         *         "dryRun": true,
                         *         "decision": {
                         *           "action": "NONE",
                         *           "state": "DISABLED",
                         *           "reason": "Chế độ thủ công (MANUAL)"
                         *         }
                         *       }
                         *     }
                         */
                        "application/json": {
                            data?: Record<string, never>;
                        };
                    };
                };
                /** @description Invalid fields, thresholds, ranges or pagination */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description JWT missing or invalid */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing automation permission */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Floor not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Active run, unresolved OFF, invalid mapping, unhealthy sensors, unapproved profiles or hardware safety gate closed */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description MQTT unavailable; OFF remains pending and is retried */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        }
export interface components {
    schemas: {
        RegisterRequest: {
            /**
             * Format: email
             * @example user@example.com
             */
            email: string;
            /** @example password123 */
            password: string;
            /** @example Nguyen Van A */
            fullName: string;
            /** @description Alias for fullName */
            name?: string;
            /**
             * @description Optional; role IDs: 1 = Admin, 2 = Farm Operator, 3 = Customer. Without roleId, Customer (3) is assigned.
             * @example 3
             */
            roleId?: number;
            /** @example 0900000000 */
            phone?: string;
            /** @example Ho Chi Minh City */
            address?: string;
        };
        LoginRequest: {
            /**
             * Format: email
             * @example user@example.com
             */
            email: string;
            /** @example password123 */
            password: string;
        };
        User: {
            /** @example 1 */
            user_id?: number;
            /** @example 2 */
            role_id?: number;
            /**
             * Format: email
             * @example user@example.com
             */
            email?: string;
            /** @example Nguyen Van A */
            full_name?: string;
            /** @example 0900000000 */
            phone?: string | null;
            /** @example Ho Chi Minh City */
            address?: string | null;
            /** @example ACTIVE */
            status?: string;
            /** Format: date-time */
            created_at?: string;
            /** Format: date-time */
            updated_at?: string;
        };
        Notification: {
            /** @example 10 */
            notification_id?: number;
            /** @example CULTIVATION_STARTED */
            notification_type?: string;
            /** @example Cultivation update */
            title?: string;
            /** @example Your cultivation session has started. */
            message?: string;
            /** @example false */
            is_read?: boolean;
            /** Format: date-time */
            created_at?: string;
            /** Format: date-time */
            read_at?: string | null;
            /** @example CULTIVATION_SESSION */
            reference_type?: string | null;
            /** @example 12 */
            reference_id?: number | null;
        };
        SentCultivationNotification: {
            /** @example 10 */
            notification_id?: number;
            /** @example 3 */
            user_id?: number;
            /** @example CULTIVATION_SESSION */
            reference_type?: string;
            /** @example 12 */
            reference_id?: number;
            /** @enum {string} */
            notification_type?: "OPERATOR_MESSAGE" | "MUSHROOM_DISEASE" | "DEVICE_ISSUE";
            /** @example Cultivation update */
            title?: string;
            /** @example Your cultivation session has started. */
            message?: string;
            /** Format: date-time */
            created_at?: string;
        };
        CreateCultivationNotificationRequest: {
            /** @example Your cultivation session is ready for the next stage. */
            message: string;
            /** @default Thông báo từ SmartMush Farm */
            title: string;
            /**
             * @default OPERATOR_MESSAGE
             * @enum {string}
             */
            type: "OPERATOR_MESSAGE" | "MUSHROOM_DISEASE" | "DEVICE_ISSUE";
        };
        UserWithRole: {
            /** @example 1 */
            user_id?: number;
            /** @example 3 */
            role_id?: number;
            /** @example Customer */
            role_name?: string;
            role_description?: string | null;
            /**
             * Format: email
             * @example user@example.com
             */
            email?: string;
            /** @example Nguyen Van A */
            full_name?: string;
            /** @example 0900000000 */
            phone?: string | null;
            /** @example Ho Chi Minh City */
            address?: string | null;
            /**
             * @example ACTIVE
             * @enum {string}
             */
            status?: "ACTIVE" | "INACTIVE" | "BLOCKED";
            /** Format: date-time */
            created_at?: string;
            /** Format: date-time */
            updated_at?: string;
        };
        UserAccountDetail: components["schemas"]["UserWithRole"] & {
            /** @example 12 */
            order_count?: number;
            /** @example 4 */
            cultivation_session_count?: number;
        };
        CreateManagedUserRequest: {
            /**
             * Format: email
             * @example staff@example.com
             */
            email: string;
            /** @example password123 */
            password: string;
            /** @example Nguyen Van A */
            fullName: string;
            /** @example 2 */
            roleId: number;
            /** @example 0900000000 */
            phone?: string;
            /** @example Ho Chi Minh City */
            address?: string;
        };
        UpdateUserProfileRequest: {
            /** @example Nguyen Van A */
            fullName?: string;
            /** @example 0900000000 */
            phone?: string | null;
            /** @example Ho Chi Minh City */
            address?: string | null;
        };
        UpdateUserStatusRequest: {
            /**
             * @example BLOCKED
             * @enum {string}
             */
            status: "ACTIVE" | "INACTIVE" | "BLOCKED";
        };
        MushroomType: {
            /** @example 1 */
            mushroom_type_id?: number;
            /** @example King Oyster */
            name?: string;
            /** @example Mushroom type for soups and hotpot */
            description?: string | null;
            /** @example 25 */
            growing_days?: number;
            /**
             * Format: double
             * @example 120000
             */
            price?: number;
            /** @example https://example.com/image.jpg */
            image_url?: string | null;
            /**
             * @example ACTIVE
             * @enum {string}
             */
            status?: "ACTIVE" | "INACTIVE";
            /** Format: date-time */
            created_at?: string;
        };
        CreateMushroomTypeRequest: {
            /** @example King Oyster */
            name: string;
            /** @example Mushroom type for soups and hotpot */
            description?: string;
            /** @example 25 */
            growingDays: number;
            /** @example 120000 */
            price: number;
            /** @example https://example.com/image.jpg */
            imageUrl?: string;
            /**
             * @example ACTIVE
             * @enum {string}
             */
            status?: "ACTIVE" | "INACTIVE";
        };
        UpdateMushroomTypeRequest: {
            /** @example King Oyster Premium */
            name?: string;
            /** @example Updated description */
            description?: string;
            /** @example 30 */
            growingDays?: number;
            /** @example 150000 */
            price?: number;
            /** @example https://example.com/new-image.jpg */
            imageUrl?: string;
            /**
             * @example INACTIVE
             * @enum {string}
             */
            status?: "ACTIVE" | "INACTIVE";
        };
        RentalPackage: {
            /** @example 1 */
            package_id?: number;
            /** @example Standard 30-day package */
            package_name?: string;
            /** @example Includes one cultivation tray */
            description?: string | null;
            /** @example 30 */
            duration_days?: number;
            /**
             * Format: double
             * @example 500000
             */
            price?: number;
            /**
             * @example ACTIVE
             * @enum {string}
             */
            status?: "ACTIVE" | "INACTIVE";
        };
        CreateRentalPackageRequest: {
            /** @example Standard 30-day package */
            packageName: string;
            /** @example Includes one cultivation tray */
            description?: string;
            /** @example 30 */
            durationDays: number;
            /** @example 500000 */
            price: number;
            /**
             * @example ACTIVE
             * @enum {string}
             */
            status?: "ACTIVE" | "INACTIVE";
        };
        UpdateRentalPackageRequest: {
            /** @example Premium 30-day package */
            packageName?: string;
            /** @example Updated package details */
            description?: string;
            /** @example 30 */
            durationDays?: number;
            /** @example 550000 */
            price?: number;
            /**
             * @example INACTIVE
             * @enum {string}
             */
            status?: "ACTIVE" | "INACTIVE";
        };
        CreateCultivationOrderRequest: {
            /**
             * @description Selected active cultivation package. Its database duration must cover the mushroom growing days.
             * @example 1
             */
            packageId: number;
            /**
             * @description Selected mushroom type.
             * @example 2
             */
            mushroomTypeId: number;
            /**
             * @description Number of cultivation trays requested.
             * @example 3
             */
            quantity: number;
        };
        PayosPaymentResponse: {
            /** @example true */
            success: boolean;
            /** @example PayOS payment created successfully */
            message: string;
            data: {
                /** @example 34 */
                paymentId: number;
                /**
                 * @description PayOS order code
                 * @example 34
                 */
                orderCode: number;
                /** @example 12 */
                orderId: number;
                /** @example 530000 */
                amount: number;
                /**
                 * Format: uri
                 * @example https://pay.payos.vn/web/abc123
                 */
                checkoutUrl: string;
                /** @example 000201010212... */
                qrCode?: string | null;
                /**
                 * Format: int64
                 * @description Unix timestamp in seconds
                 * @example 1735689600
                 */
                expiresAt: number;
                /**
                 * @example PENDING
                 * @enum {string}
                 */
                paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";
            };
        };
        PaymentStatusResponse: {
            /** @example true */
            success: boolean;
            data: {
                /** @example 12 */
                orderId: number;
                /**
                 * @description Becomes PROCESSING after a successful PayOS payment and cultivation allocation.
                 * @example PENDING
                 * @enum {string}
                 */
                orderStatus: "PENDING" | "CONFIRMED" | "PROCESSING" | "COMPLETED" | "CANCELLED";
                /**
                 * @example PENDING
                 * @enum {string}
                 */
                paymentStatus: "UNPAID" | "PENDING" | "PAID" | "FAILED" | "REFUND_PENDING" | "REFUNDED";
                /**
                 * @description PayOS order code for the latest payment
                 * @example 34
                 */
                paymentCode: string;
                /** @example 530000 */
                amount: number;
            };
        };
        CultivationRoom: {
            /** @example 1 */
            room_id?: number;
            /** @example ROOM-01 */
            room_code?: string;
            /** @example Growing room 1 */
            room_name?: string;
            /** @example Main cultivation room */
            description?: string | null;
            /** @example 20 */
            capacity?: number;
            /**
             * @example ACTIVE
             * @enum {string}
             */
            status?: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
            /** Format: date-time */
            created_at?: string;
            /** Format: date-time */
            updated_at?: string;
        };
        CreateCultivationRoomRequest: {
            /** @example ROOM-01 */
            roomCode: string;
            /** @example Growing room 1 */
            roomName: string;
            /** @example Main cultivation room */
            description?: string;
            /** @example 20 */
            capacity?: number;
            /**
             * @example ACTIVE
             * @enum {string}
             */
            status?: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
        };
        UpdateCultivationRoomRequest: {
            /** @example ROOM-01 */
            roomCode?: string;
            /** @example Growing room 1 */
            roomName?: string;
            description?: string | null;
            /** @example 24 */
            capacity?: number;
            /** @enum {string} */
            status?: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
        };
        CultivationTray: {
            /** @example 1 */
            tray_id?: number;
            /** @example 1 */
            room_id?: number;
            /** @example ROOM-01 */
            room_code?: string;
            /** @example Growing room 1 */
            room_name?: string;
            /** @example 1 */
            floor_id?: number | null;
            /** @example 1 */
            floor_number?: number | null;
            /** @example Floor 1 */
            floor_name?: string | null;
            /** @example TRAY-01 */
            tray_code?: string;
            /** @example Rack A, level 1 */
            tray_name?: string | null;
            /**
             * @example AVAILABLE
             * @enum {string}
             */
            status?: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "INACTIVE";
            /** Format: date-time */
            created_at?: string;
            /** Format: date-time */
            updated_at?: string;
        };
        CreateCultivationTrayRequest: {
            /** @example 1 */
            roomId: number;
            /**
             * @description Optional floor within the selected room. Trays without a floor cannot start cultivation.
             * @example 1
             */
            floorId?: number | null;
            /** @example TRAY-01 */
            trayCode: string;
            /** @example Rack A, level 1 */
            trayName?: string;
            /**
             * @example AVAILABLE
             * @enum {string}
             */
            status?: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "INACTIVE";
        };
        UpdateCultivationTrayRequest: {
            /** @example 1 */
            roomId?: number;
            /**
             * @description Assign a floor in the selected room, or null to unassign it.
             * @example 1
             */
            floorId?: number | null;
            /** @example TRAY-01 */
            trayCode?: string;
            trayName?: string | null;
            /** @enum {string} */
            status?: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "INACTIVE";
        };
        MushroomCondition: {
            /** @example 1 */
            condition_id?: number;
            /** @example 1 */
            mushroom_type_id?: number;
            /** @example 18 */
            temperature_min?: number | null;
            /** @example 24 */
            temperature_max?: number | null;
            /** @example 80 */
            humidity_min?: number | null;
            /** @example 90 */
            humidity_max?: number | null;
            /** Format: date-time */
            created_at?: string;
            /** Format: date-time */
            updated_at?: string;
        };
        CreateMushroomConditionRequest: {
            /** @example 1 */
            mushroomTypeId: number;
            /** @example 18 */
            temperatureMin?: number | null;
            /** @example 24 */
            temperatureMax?: number | null;
            /** @example 80 */
            humidityMin?: number | null;
            /** @example 90 */
            humidityMax?: number | null;
        };
        UpdateMushroomConditionRequest: {
            /** @example 1 */
            mushroomTypeId?: number;
            /** @example 17 */
            temperatureMin?: number | null;
            /** @example 25 */
            temperatureMax?: number | null;
            /** @example 75 */
            humidityMin?: number | null;
            /** @example 88 */
            humidityMax?: number | null;
        };
        AuthResponse: {
            /** @example Login successful */
            message?: string;
            accessToken?: string;
            refreshToken?: string;
            /** @example Bearer */
            tokenType?: string;
            /** @example 15m */
            expiresIn?: string;
            /** @example eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... */
            token?: string;
            user?: components["schemas"]["User"];
        };
        Error: {
            /**
             * @description Business validation error. Each mushroom type can only have one condition.
             * @example Nấm này đã có condition rồi
             */
            message?: string;
        };
        IotMaster: {
            id?: number;
            /** @example master01 */
            masterId?: string;
            cultivationRoomId?: number | null;
            /** @description Room light SSR channel; null means unconfigured. Channel 3 maps to GPIO6. */
            light_ssr_channel?: number | null;
            /** @enum {string|null} */
            reportedStatus?: "online" | "offline" | null;
            /**
             * Format: date-time
             * @description Last non-retained message arrival; not a connectivity guarantee.
             */
            lastSeenAt?: string | null;
            /** Format: date-time */
            statusReceivedAt?: string | null;
            statusRetained?: boolean | null;
        };
        IotSensor: {
            masterId?: string;
            nodeId?: number;
            sensorId?: number;
            temperature?: number | null;
            humidity?: number | null;
            /** @description Current health: valid, non-retained reading within 60 seconds and a live master. */
            ok?: boolean;
            /** @description Validity of the last received packet, independent of current connectivity. */
            readingValid?: boolean;
            /**
             * @description Null when healthy.
             * @enum {string|null}
             */
            healthReason?: "MASTER_OFFLINE" | "RETAINED" | "STALE" | "INVALID" | null;
            /** Format: date-time */
            lastReceivedAt?: string | null;
            /** Format: date-time */
            lastValidAt?: string | null;
            /**
             * Format: date-time
             * @description Always null: firmware supplies no measurement timestamp.
             */
            measuredAt?: string | null;
            retained?: boolean;
        };
        IotSensors: {
            masterId?: string;
            sensors?: components["schemas"]["IotSensor"][];
        };
        IotHistory: {
            masterId?: string;
            nodeId?: number;
            sensorId?: number;
            limit?: number;
            offset?: number;
            readings?: {
                id?: string;
                temperature?: number | null;
                humidity?: number | null;
                /** @description Validity of this historical packet. */
                ok?: boolean;
                /** Format: date-time */
                receivedAt?: string | null;
                /**
                 * Format: date-time
                 * @description Always null: firmware supplies no measurement timestamp.
                 */
                measuredAt?: string | null;
                retained?: boolean;
            }[];
        };
        IotSsr: {
            masterId?: string;
            channels?: {
                channel?: number;
                /** @enum {string|null} */
                desiredState?: "ON" | "OFF" | null;
                /** @enum {string|null} */
                reportedState?: "ON" | "OFF" | null;
                /** Format: date-time */
                lastCommandAt?: string | null;
                /** Format: date-time */
                lastReportedAt?: string | null;
                reportedRetained?: boolean | null;
                /** @description Value comparison only; not command acknowledgment or physical verification. */
                statesMatch?: boolean | null;
            }[];
        };
        IotCommand: {
            /** Format: uuid */
            commandId?: string;
            masterId?: string;
            channel?: number;
            /** @enum {string} */
            action?: "ON" | "OFF";
            /** @enum {string} */
            status?: "PENDING" | "PUBLISHED" | "FAILED" | "TIMED_OUT";
            requestedBy?: number | null;
            /** Format: date-time */
            requestedAt?: string | null;
            /** Format: date-time */
            expiresAt?: string | null;
            /** Format: date-time */
            publishedAt?: string | null;
            /** Format: date-time */
            completedAt?: string | null;
            errorMessage?: string | null;
        };
        AutoMistingConfiguration: {
            mushroom_type_id?: number;
            humidity_min: number;
            humidity_max: number;
            humidity_start_threshold: number;
            humidity_stop_threshold: number;
            misting_pulse_ms: number;
            cooldown_ms: number;
            evaluation_interval_ms: number;
            sensor_max_age_ms?: number;
            required_valid_sensors?: number;
            max_sensor_spread_percent: number;
            max_activations_per_hour: number;
            max_cumulative_on_ms_per_hour: number;
            profile_name?: string | null;
            /** @default false */
            profile_approved: boolean;
            /** @description FLOOR only: approve crop types before assigning sessions. Server reads conditions and stores source_profiles. Must include all crops currently on the floor. */
            mushroom_type_ids?: number[];
            /**
             * @description FLOOR derives crop types from assigned tray sessions; requires a reviewed named profile. LEGACY requires mushroom_type_id.
             * @default LEGACY
             * @enum {string}
             */
            config_source: "LEGACY" | "FLOOR";
            /**
             * @description Run fan cycles within the same AUTO run and start/stop controls.
             * @default false
             */
            fan_enabled: boolean;
            fan_run_minutes?: number | null;
            fan_rest_minutes?: number | null;
            /**
             * @description When true all temperature fields and cooling_humidity_limit are required.
             * @default false
             */
            cooling_enabled: boolean;
            temperature_min?: number;
            temperature_max?: number;
            temperature_start_threshold?: number;
            temperature_stop_threshold?: number;
            cooling_humidity_limit?: number;
            max_temperature_spread_c?: number;
        };
        CultivationFloorMapping: {
            room_id: number;
            floor_number: number;
            floor_name: string;
            master_id: number;
            node_address: number;
            misting_ssr_channel: number;
            /** @enum {string} */
            status?: "ACTIVE" | "INACTIVE";
            total_rows?: number | null;
            total_columns?: number | null;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
