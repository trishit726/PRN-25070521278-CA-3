# Database structure

LabOps uses MongoDB Community Server locally (`mongodb://127.0.0.1:27017/labops`) and Atlas through the same configurable `MONGO_URI` setting.

| Collection/model | Purpose                                       | Key references and indexes                                            |
| ---------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| Users            | Identity, role, department, active state      | Unique lowercase email; password hash excluded from default selection |
| Laboratories     | Rooms, departments, assigned technicians      | Unique code; technician ObjectId references                           |
| Assets           | Equipment identity and condition              | Unique assetCode, serialNumber, qrCodeId; lab reference               |
| Reservations     | Requested equipment time ranges and decisions | Asset and user references; conflict query index on asset/time/status  |
| Maintenance      | Equipment issue and resolution lifecycle      | Asset, reporter, technician references                                |
| Notifications    | User-specific read state and updates          | Indexed userId                                                        |
| ActivityLogs     | Administrative audit trail                    | User reference and entity identifiers                                 |

Mongoose enables timestamps on each model. Asset QR values contain a random stable identifier; QR image data is generated on demand by `GET /assets/:id/qr` and is not stored in MongoDB.

Open Compass and connect to `mongodb://127.0.0.1:27017`. The server must be running. After seed or application writes, choose the `labops` database to inspect the collections.
