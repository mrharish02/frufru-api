// @ts-nocheck
import { Hono } from 'hono'
import * as XLSX from "xlsx";

type Env = {
  FILE_BUCKET: R2Bucket;
  DB: D1Database;
};

const app = new Hono<{ Bindings: Env }>()

app.get('/', (c) => {
  return c.text('This is frufru backend server!!!')
})

app.options('/updateAllocationSettings', async (c) => {
  // Set CORS headers for preflight request
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200);
});

app.get('/updateAllocationSettings', async (c) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET,OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  const sid = c.req.query('SID');  // Get SID from query parameter
  console.log(sid)
  
  if (!sid) {
    return c.json({ message: 'SID parameter is required' }, 400);
  }

  try {
    const result = await c.env.DB.prepare('SELECT * FROM AllocationSettings WHERE SID = ?;')
      .bind(sid)  // Bind the SID value safely
      .all();
    
    return c.json(result);
  } catch (error) {
    return c.json({ message: 'Error fetching data', error: error }, 500);
  }
});

app.post('/updateAllocationSettings', async (c) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'POST,OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  try {
    const body = await c.req.json();
    const {SID, BoxCount, CutOffTime, PriorityStockDisposal, DuplicateOrderAlert, SizeAllocationRatioAlert, RankAProductPrioritization, RankAStrawberriesPrioritization, CustomerRequestPrioritization } = body;

    if (SID === undefined || BoxCount === undefined || CutOffTime === undefined || PriorityStockDisposal === undefined || DuplicateOrderAlert === undefined || SizeAllocationRatioAlert === undefined || RankAProductPrioritization === undefined || RankAStrawberriesPrioritization === undefined || CustomerRequestPrioritization === undefined ) {
      return c.json({ message: 'Missing required fields' }, 400);
    }

    const result = await c.env.DB.prepare(`INSERT INTO AllocationSettings (SID, BoxCount, CutOffTime, PriorityStockDisposal, DuplicateOrderAlert, SizeAllocationRatioAlert, RankAProductPrioritization, RankAStrawberriesPrioritization, CustomerRequestPrioritization) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(SID, BoxCount, CutOffTime, PriorityStockDisposal, DuplicateOrderAlert, SizeAllocationRatioAlert, RankAProductPrioritization, RankAStrawberriesPrioritization, CustomerRequestPrioritization)
      .run();

    if (result.success) {
      return c.json({ message: 'Data inserted successfully', result: result }, 200);
    } else {
      return c.json({ message: 'Failed to insert data', error: result.error }, 500);
    }
  } catch (error) {
    console.error('Error inserting data into AllocationSettings:', error);
    return c.json({ message: 'Error processing request', error: error }, 500);
  }
});

app.put('/updateAllocationSettings', async (c) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'PUT,OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  
  try {
    const body = await c.req.json();
    const { SID, BoxCount, CutOffTime, PriorityStockDisposal, DuplicateOrderAlert, SizeAllocationRatioAlert, RankAProductPrioritization, RankAStrawberriesPrioritization, CustomerRequestPrioritization } = body;

    // Check for required fields
    if (SID === undefined || BoxCount === undefined || CutOffTime === undefined || PriorityStockDisposal === undefined || DuplicateOrderAlert === undefined || SizeAllocationRatioAlert === undefined || RankAProductPrioritization === undefined || RankAStrawberriesPrioritization === undefined || CustomerRequestPrioritization === undefined ) {
      return c.json({ message: 'Missing required fields' }, 400);
    }

    // Update the existing record based on SID
    const result = await c.env.DB.prepare(`
      UPDATE AllocationSettings
      SET BoxCount = ?, CutOffTime = ?, PriorityStockDisposal = ?, DuplicateOrderAlert = ?, SizeAllocationRatioAlert = ?, RankAProductPrioritization = ?, RankAStrawberriesPrioritization = ?, CustomerRequestPrioritization = ?
      WHERE SID = ?
    `)
      .bind(BoxCount, CutOffTime, PriorityStockDisposal, DuplicateOrderAlert, SizeAllocationRatioAlert, RankAProductPrioritization, RankAStrawberriesPrioritization, CustomerRequestPrioritization, SID)
      .run();

    if (result.success) {
      return c.json({ message: 'Data updated successfully', result: result }, 200);
    } else {
      return c.json({ message: 'Failed to update data', error: result.error }, 500);
    }
  } catch (error) {
    console.error('Error updating data in AllocationSettings:', error);
    return c.json({ message: 'Error processing request', error: error }, 500);
  }
});


// Upload Order data
app.options('/uploadOrderData', async (c) => {
  // Set CORS headers for preflight request
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200);
});

function countNullValues(orders:any) {
  let nullCount = 0;

  orders.forEach((order:any) => {
    // Loop through each key in the order object
    Object.values(order).forEach((value) => {
      if (value === null) {
        nullCount++;
      }
    });
  });

  return nullCount;
}
app.post('/uploadOrderData', async (c) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  
  const form = await c.req.formData();
  const file = form.get("file");
  
  if (file instanceof File) {
    const buffer = await file.arrayBuffer();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${file.name}_${timestamp}`;
    const fileSize = buffer.byteLength;
    const uploadStatus = "Success";

    // // Step 1: Upload the file to R2 bucket
    // await c.env.FILE_BUCKET.put(fileName, buffer);

    // Step 2: Insert file details into `orderdata` table
    const insertFileResult = await c.env.DB.prepare(`
      INSERT INTO orderdata (fileName, uploadDate, uploadStatus, fileSize)
      VALUES (?, CURRENT_TIMESTAMP, ?, ?)
      RETURNING id, fileName, uploadDate, uploadStatus, fileSize
    `)
    .bind(fileName, uploadStatus, fileSize)
    .run();

    if (!insertFileResult.success) {
      return c.json({ message: "Failed to insert file data", error: insertFileResult.error }, 500);
    }

    // Get the fileId of the newly inserted file
    const fileId = insertFileResult.results[0].id;
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0]; // Get the first sheet
    const worksheet = workbook.Sheets[sheetName];

  // Load the workbook
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  function sheetToJsonUsingW(worksheet) {
    const result = [];
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    console.log(sheet)

    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const row = {};
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const headerAddress = XLSX.utils.encode_cell({ r: range.s.r, c: C });

        const cell = sheet[cellAddress];
        const headerCell = sheet[headerAddress];

        if (headerCell) {
          const header = String(headerCell.w || headerCell.v);
          row[header] = cell ? (cell.w || cell.v) : null;
        }
      }
      // Check if all values are null or empty
      const isEmpty = Object.values(row).every(value => value === null || value === '');

      // If any value is non-null/non-empty, push the order to the array
      if (!isEmpty) {
        if (Object.keys(row).length) result.push(row);
      }
    }
    return result;
  }
  const jsonData = sheetToJsonUsingW(sheet);

    const orders:any = [];
    jsonData.forEach((row) => {
      let orderDate = row['Order Date'] || null;
      if (orderDate) {
        // Assuming the date is in the format 'YYYY/MM/DD HH:mm'
        const dateParts = orderDate.split(" ");
        const [year, month, day] = dateParts[0].split("/");
        const time = dateParts[1];

        // Construct the date in 'YYYY-MM-DD HH:mm:ss' format
        orderDate = `${year}-${month}-${day} ${time}:00`;  // Adding seconds to match DATETIME format
      }
      const order = { SystemUploadDate: new Date().toISOString(), OrderDate: orderDate, OrderNo: row['Order No.'] || null, ProductCode: row['Product code'] || null, Quantity: row['Quantity'] || null, CustomerCode: row['Customer code'] || null, Message: row['Message'] || null, DesiredDeliveryDate: row['Desired Delivery Date'] || null, DesiredDeliveryTime: row['Desired Delivery Time'] || null, fileId: fileId};
      orders.push(order);
    });

    console.log("orders",jsonData,orders)

    // Step 4: Insert all rows into `uploadedOrderData` table in bulk
    const insertPromises = orders.map(order => {
      return c.env.DB.prepare(`
        INSERT INTO uploadedOrderData 
          (SystemUploadDate, OrderDate, OrderNo, ProductCode, Quantity, CustomerCode, Message, DesiredDeliveryDate, DesiredDeliveryTime, status, fileId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind( order.SystemUploadDate, order.OrderDate, order.OrderNo, order.ProductCode, order.Quantity, order.CustomerCode, order.Message, order.DesiredDeliveryDate, order.DesiredDeliveryTime, "new", order.fileId)
      .run();
    });

    try {
      await Promise.all(insertPromises);
      const totalNullValues = countNullValues(orders);
      if (totalNullValues > 0) {
        return c.json(
          {
            message: "File uploaded, but some fields have null values.",
            nullValuesCount: totalNullValues,
            fileId: fileId
          },
          403
        );
      }
      return c.json({ message: "File uploaded and data stored successfully!" }, 200);
    } catch (error) {
      await c.env.DB.prepare(`
          DELETE FROM orderdata WHERE id = ?
      `)
      .bind(fileId)
      .run();    
      console.log(error)
      return c.json({ message: "Error inserting order data", error }, 500);
    }
  } else {
    return c.json({ error: "No file uploaded" }, 400);
  }
});

// Get uploaded orders with pagination
app.options('/getUploadedOrders', async (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200); 
});

app.get('/getUploadedOrders', async (c) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET');
  c.header('Access-Control-Allow-Headers', '*');

  const page = parseInt(c.req.query('page') || '1', 10);
  const pageSize = parseInt(c.req.query('pageSize') || '10', 10);

  // Calculate offset and limit
  const offset = (page - 1) * pageSize;

  try {
    // Get the total count of records
    const countResult = await c.env.DB.prepare(`SELECT COUNT(*) as count FROM orderdata`).first<{ count: number }>();
    if (!countResult || countResult.count === undefined) {
      return c.json({ message: 'Error fetching total count' }, 500);
    }
    const totalCount = countResult.count;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Fetch the paginated data
    const orders = await c.env.DB.prepare(`
      SELECT * FROM orderdata
      ORDER BY uploadDate DESC
      LIMIT ? OFFSET ?
    `)
    .bind(pageSize, offset)
    .all();

    return c.json({
      orders: orders,
      pagination: {
        totalPages,
        currentPage: page,
        pageSize,
        totalRecords: totalCount,
      }
    }, 200);
  } catch (error) {
    console.error("Error fetching uploaded orders:", error);
    return c.json({ message: 'Error fetching data', error }, 500);
  }
});

app.options('/updateOrderData', async (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200); 
});

app.post('/updateOrderData', async (c) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'POST,OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');

  try {
    // Parse JSON input
    const data = await c.req.json();

    // Default values for missing fields
    const id = parseInt(data.id, 10) || null;
    const SystemUploadDate = data.SystemUploadDate ? new Date(data.SystemUploadDate).toISOString() : null;
    const OrderDate = data.OrderDate ? new Date(data.OrderDate).toISOString().split('T')[0] : null;
    const OrderNo = data.OrderNo || null;
    const ProductCode = data.ProductCode || null;
    const Quantity = data.Quantity ? parseInt(data.Quantity, 10) : null;
    const CustomerCode = data.CustomerCode || null;
    const Message = data.Message || null;
    const DesiredDeliveryDate = data.DesiredDeliveryDate || null;
    const DesiredDeliveryTime = data.DesiredDeliveryTime || null;
    const fileId = data.fileId ? parseInt(data.fileId, 10) : null;

    if (!id) {
      return c.json({ success: false, message: 'id is required for update' }, 400);
    }

    // Prepare SQL query
    const query = `
      UPDATE uploadedOrderData
      SET
        SystemUploadDate = ?,
        OrderDate = ?,
        OrderNo = ?,
        ProductCode = ?,
        Quantity = ?,
        CustomerCode = ?,
        Message = ?,
        DesiredDeliveryDate = ?,
        DesiredDeliveryTime = ?,
        fileId = ?
      WHERE id = ?
    `;

    // Execute query
    const result = await c.env.DB.prepare(query).bind(
      SystemUploadDate,
      OrderDate,
      OrderNo,
      ProductCode,
      Quantity,
      CustomerCode,
      Message,
      DesiredDeliveryDate,
      DesiredDeliveryTime,
      fileId,
      id
    ).run();

    // Return response
    console.log(result)
    if (result.meta.changes > 0) {
      return c.json({ success: true, message: 'Order data updated successfully' });
    } else {
      return c.json({ success: false, message: 'No record found with the given id' });
    }
  } catch (error) {
    console.error('Error updating uploaded order data:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.options('/deleteUploadedOrders', async (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200); 
});

app.delete('/deleteUploadedOrders', async (c) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'DELETE,OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');

  const fileId = c.req.query('fileId');

  if (!fileId) {
    return c.json({ message: 'fileId is required' }, 400);
  }

  try {
    // Delete the records associated with the given fileId
    const deleteResult = await c.env.DB.prepare(`
      DELETE FROM orderdata
      WHERE id = ?
    `).bind(fileId).run();

    return c.json({
      message: `Records with fileId ${fileId} deleted successfully`,
    }, 200);
  } catch (error) {
    console.error("Error deleting uploaded orders:", error);
    return c.json({ message: 'Error deleting data', error }, 500);
  }
});

app.options('/getOrderData/:fileId', async (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200); 
});

app.get('/getOrderData/:fileId', async (c) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');

  const { fileId } = c.req.param()
  
  try {
    // const file = await c.env.FILE_BUCKET.get(fileId)

    const queryResult = await c.env.DB.prepare(`
      SELECT * 
      FROM uploadedOrderData 
      WHERE fileId = ?
    `).bind(fileId).all();

    // Check if the query returned results
    if (!queryResult.results || queryResult.results.length === 0) {
      return c.json({ message: 'No data found for the given fileId' }, 404);
    }

    // Return the query result as JSON
    return c.json({
      message: 'Data fetched successfully',
      data: queryResult.results,
    }, 200);
  } catch (error) {
    return c.json({ message: 'Error fetching file', error: error }, 500)
  }
})

// Upload Shipment data
app.options('/ShipmentData', async (c) => {
  // Set CORS headers for preflight request
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'DELETE, GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200);
});

app.post('/ShipmentData', async (c) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  
  const form = await c.req.formData();
  const file = form.get("file");
  
  if (file instanceof File) {
    const buffer = await file.arrayBuffer();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${file.name}_${timestamp}`;
    const fileSize = buffer.byteLength;
    const uploadStatus = "Success";

    // // Step 1: Upload the file to R2 bucket
    // await c.env.FILE_BUCKET.put(fileName, buffer);

    // Step 2: Insert file details into `orderdata` table
    const insertFileResult = await c.env.DB.prepare(`
      INSERT INTO shipmentavailabledata (fileName, uploadDate, uploadStatus, fileSize)
      VALUES (?, CURRENT_TIMESTAMP, ?, ?)
      RETURNING id, fileName, uploadDate, uploadStatus, fileSize
    `)
    .bind(fileName, uploadStatus, fileSize)
    .run();

    if (!insertFileResult.success) {
      return c.json({ message: "Failed to insert file shipment available data", error: insertFileResult.error }, 500);
    }

    // Get the fileId of the newly inserted file
    const fileId = insertFileResult.results[0].id;
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0]; // Get the first sheet
    const worksheet = workbook.Sheets[sheetName];

  // Load the workbook
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  function sheetToJsonUsingW(worksheet) {
    const result = [];
    const range = XLSX.utils.decode_range(worksheet['!ref']);

    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const row = {};
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const headerAddress = XLSX.utils.encode_cell({ r: range.s.r, c: C });

        const cell = sheet[cellAddress];
        const headerCell = sheet[headerAddress];

        if (headerCell) {
          const header = String(headerCell.w || headerCell.v);
          row[header] = cell ? (cell.w || cell.v) : null;
        }
      }
      if (Object.keys(row).length) result.push(row);
    }
    return result;
  }
  const jsonData = sheetToJsonUsingW(sheet);

  const shipments: any = [];
  jsonData.forEach((row) => {
    const shipment = {
      farm_name: row['農園名'] || null, // "Farm Name"
      timestamp: new Date().toISOString(), // Current timestamp
      shipment_status: row['出荷可能もしくは不可でしょうか？'] || null, // "Shipment Status"
      target_shipping_date: row['出荷対象日を入力してください。'] || null, // "Target Shipping Date"
      non_standard_large_boxes: row['規格外（大）箱数'] || 0, // "Non-standard Large Boxes"
      non_standard_medium_boxes: row['規格外（中）箱数'] || 0, // "Non-standard Medium Boxes"
      non_standard_small_boxes: row['規格外（小）箱数'] || 0, // "Non-standard Small Boxes"
      three_la: row['3LA'] || 0,
      three_lb: row['3LB'] || 0,
      two_la: row['2LA'] || 0,
      two_lb: row['2LB'] || 0,
      la: row['LA'] || 0,
      lb: row['LB'] || 0,
      ma: row['MA'] || 0,
      mb: row['MB'] || 0,
      sa: row['SA'] || 0,
      sb: row['SB'] || 0,
      fileId: fileId, // Reference to the uploaded file
    };
    shipments.push(shipment);
  });
  
  console.log(shipments);
  

    

    // Step 4: Insert all rows into `shipmentavailable` table in bulk
  const insertShipmentPromises = shipments.map(shipment => {
    return c.env.DB.prepare(`
      INSERT INTO shipmentavailable 
        (farm_name, timestamp, shipment_status, target_shipping_date, non_standard_large_boxes, non_standard_medium_boxes, non_standard_small_boxes, three_la, three_lb, two_la, two_lb, la, lb, ma, mb, sa, sb, fileId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      shipment.farm_name,
      shipment.timestamp,
      shipment.shipment_status,
      shipment.target_shipping_date,
      shipment.non_standard_large_boxes,
      shipment.non_standard_medium_boxes,
      shipment.non_standard_small_boxes,
      shipment.three_la,
      shipment.three_lb,
      shipment.two_la,
      shipment.two_lb,
      shipment.la,
      shipment.lb,
      shipment.ma,
      shipment.mb,
      shipment.sa,
      shipment.sb,
      shipment.fileId
    )
    .run();
  });

  // Execute all insert queries
Promise.all(insertShipmentPromises)
.then(() => console.log('All shipments inserted successfully!'))
.catch(err => console.error('Error inserting shipments:', err));

    try {
      await Promise.all(insertShipmentPromises);
      return c.json({ message: "File uploaded and shipment data stored successfully!" }, 200);
    } catch (error) {
      await c.env.DB.prepare(`
          DELETE FROM shipmentavailabledata WHERE id = ?
      `)
      .bind(fileId)
      .run();    
      console.log(error)
      return c.json({ message: "Error inserting shipment data", error }, 500);
    }
  } else {
    return c.json({ error: "No file uploaded" }, 400);
  }
});

// Get Shipment data with pagination
app.options('/ShipmentData', async (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'DELETE,GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200); 
});

app.get('/ShipmentData', async (c) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET');
  c.header('Access-Control-Allow-Headers', '*');

  const page = parseInt(c.req.query('page') || '1', 10);
  const pageSize = parseInt(c.req.query('pageSize') || '10', 10);

  // Calculate offset and limit
  const offset = (page - 1) * pageSize;

  try {
    // Get the total count of records
    const countResult = await c.env.DB.prepare(`SELECT COUNT(*) as count FROM shipmentavailabledata`).first<{ count: number }>();
    if (!countResult || countResult.count === undefined) {
      return c.json({ message: 'Error fetching total count' }, 500);
    }
    const totalCount = countResult.count;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Fetch the paginated data
    const orders = await c.env.DB.prepare(`
      SELECT * FROM shipmentavailabledata
      ORDER BY uploadDate DESC
      LIMIT ? OFFSET ?
    `)
    .bind(pageSize, offset)
    .all();

    return c.json({
      orders: orders,
      pagination: {
        totalPages,
        currentPage: page,
        pageSize,
        totalRecords: totalCount,
      }
    }, 200);
  } catch (error) {
    console.error("Error fetching uploaded orders:", error);
    return c.json({ message: 'Error fetching data', error }, 500);
  }
});

// Delete shipment data
app.options('/ShipmentData', async (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200); 
});

app.delete('/ShipmentData', async (c) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'DELETE,OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');

  const fileId = c.req.query('fileId');

  if (!fileId) {
    return c.json({ message: 'fileId is required' }, 400);
  }

  try {
    // Delete the records associated with the given fileId
    const deleteResult = await c.env.DB.prepare(`
      DELETE FROM shipmentavailabledata
      WHERE id = ?
    `).bind(fileId).run();

    return c.json({
      message: `Records with fileId ${fileId} deleted successfully`,
    }, 200);
  } catch (error) {
    console.error("Error deleting uploaded orders:", error);
    return c.json({ message: 'Error deleting data', error }, 500);
  }
});

//  Get files by id and name in shipment data
app.options('/getShipmentAvailableData/:fileId', async (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200); 
});

app.get('/getShipmentAvailableData/:fileId', async (c) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');

  const { fileId } = c.req.param()
  
  try {
    // const file = await c.env.FILE_BUCKET.get(fileId)

    const queryResult = await c.env.DB.prepare(`
      SELECT * 
      FROM ShipmentAvailable 
      WHERE fileId = ?
    `).bind(fileId).all();

    // Check if the query returned results
    if (!queryResult.results || queryResult.results.length === 0) {
      return c.json({ message: 'No data found for the given fileId' }, 404);
    }

    // Return the query result as JSON
    return c.json({
      message: 'Data fetched successfully',
      data: queryResult.results,
    }, 200);
  } catch (error) {
    return c.json({ message: 'Error fetching file', error: error }, 500)
  }
})

// Update shipment data in table
app.options('/updateShipmentAvailableData', async (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200); 
});

app.post('/updateShipmentAvailableData', async (c) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'POST,OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');

  try {
    // Parse JSON input
    const data = await c.req.json();

    // Extract data and assign default values for missing fields
    const id = parseInt(data.id, 10) || null;
    const farm_name = data.farm_name || null;
    const timestamp = data.timestamp ;
    const shipment_status = data.shipment_status || null;
    const target_shipping_date = data.target_shipping_date;
    const non_standard_large_boxes = parseInt(data.non_standard_large_boxes, 10) || 0;
    const non_standard_medium_boxes = parseInt(data.non_standard_medium_boxes, 10) || 0;
    const non_standard_small_boxes = parseInt(data.non_standard_small_boxes, 10) || 0;
    const three_la = parseInt(data.three_la, 10) || 0;
    const three_lb = parseInt(data.three_lb, 10) || 0;
    const two_la = parseInt(data.two_la, 10) || 0;
    const two_lb = parseInt(data.two_lb, 10) || 0;
    const la = parseInt(data.la, 10) || 0;
    const lb = parseInt(data.lb, 10) || 0;
    const ma = parseInt(data.ma, 10) || 0;
    const mb = parseInt(data.mb, 10) || 0;
    const sa = parseInt(data.sa, 10) || 0;
    const sb = parseInt(data.sb, 10) || 0;
    const fileId = data.fileId ? parseInt(data.fileId, 10) : null;

    if (!id) {
      return c.json({ success: false, message: 'id is required for update' }, 400);
    }

    // Prepare SQL query
    const query = `
      UPDATE shipmentavailable
      SET
        farm_name = ?,
        timestamp = ?,
        shipment_status = ?,
        target_shipping_date = ?,
        non_standard_large_boxes = ?,
        non_standard_medium_boxes = ?,
        non_standard_small_boxes = ?,
        three_la = ?,
        three_lb = ?,
        two_la = ?,
        two_lb = ?,
        la = ?,
        lb = ?,
        ma = ?,
        mb = ?,
        sa = ?,
        sb = ?,
        fileId = ?
      WHERE id = ?
    `;

    // Execute query
    const result = await c.env.DB.prepare(query)
      .bind(
        farm_name,
        timestamp,
        shipment_status,
        target_shipping_date,
        non_standard_large_boxes,
        non_standard_medium_boxes,
        non_standard_small_boxes,
        three_la,
        three_lb,
        two_la,
        two_lb,
        la,
        lb,
        ma,
        mb,
        sa,
        sb,
        fileId,
        id
      )
      .run();

    // Return response
    console.log(result)
    if (result.meta.changes > 0) {
      return c.json({ success: true, message: 'Shipment available data updated successfully' });
    } else {
      return c.json({ success: false, message: 'No record found with the given id' });
    }
  } catch (error) {
    console.error('Error updating uploaded order data:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// Execute allocation
app.options('/executeAllocation', async (c) => {
  // Set CORS headers for preflight request
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200);
});

// app.get('/executeAllocation', async (c) => {
//   // Add CORS headers
//   c.header('Access-Control-Allow-Origin', '*');
//   c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
//   c.header('Access-Control-Allow-Headers', '*');

  

//   return c.json({status:"Orders alloted"}, 200);
// });

app.get('/executeAllocation', async (c) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');

  try {
    const db = c.env.DB;

    // Fetch all pending orders and join with masterdata for customer preferences
    const ordersQuery = `
      SELECT 
        o.id AS orderId,
        o.OrderDate,
        o.OrderNo,
        o.ProductCode,
        o.Quantity,
        o.CustomerCode,
        o.DesiredDeliveryDate,
        o.DesiredDeliveryTime,
        c.companyName,
        c.customerRank,
        c.isAlternativeVariety,
        c.isAlternativeSize,
        c.prohibitedVarieties,
        c.prohibitedFarms,
        o.status
      FROM uploadedOrderData o
      JOIN masterdata c ON o.CustomerCode = c.orderID
      WHERE o.status = 'new'
      ORDER BY o.DesiredDeliveryDate ASC, c.customerRank DESC
    `;
    const orders = await db.prepare(ordersQuery).all();

    console.log("orders all", orders)

    if (!orders.results || orders.results.length === 0) {
      return c.json({ status: 'No pending orders found', orders: [] }, 200);
    }

    // Fetch all shipment availability data
    const shipmentsQuery = `
      SELECT 
        * 
      FROM shipmentavailable
      WHERE shipment_status = '出荷可能です。'
      ORDER BY target_shipping_date ASC, farm_name ASC
    `;
    const shipments = await db.prepare(shipmentsQuery).all();

    if (!shipments.results || shipments.results.length === 0) {
      return c.json({ status: 'No shipment data available', orders: orders.results }, 200);
    }

    // Fetch product-to-size mappings
    const productRulesQuery = `
      SELECT 
        product_code, size
      FROM productMaster
    `;
    const productRules = await db.prepare(productRulesQuery).all();

    if (!productRules.results || productRules.results.length === 0) {
      return c.json({ status: 'No product size rules found', orders: orders.results }, 200);
    }

    const productSizeMap = {};
    productRules.results.forEach((rule) => {
      productSizeMap[rule.ProductCode] = rule.size;
    });

    const executedOrders = [];

    // Allocate orders
    for (const order of orders.results) {
      const productSize = productSizeMap[order.ProductCode];
      let allocated = false;

      for (const shipment of shipments.results) {
        // Skip prohibited farms
        if (order.prohibitedFarms && order.prohibitedFarms.includes(shipment.farm_name)) {
          console.log("order is in prohibited farm");
          continue;
        }

        // Check if the required size is available
        if (shipment[productSize] && shipment[productSize] >= order.Quantity) {
          // Deduct quantity from shipment
          await db.prepare(`
            UPDATE shipmentavailable
            SET ${productSize} = ${productSize} - ?
            WHERE id = ?
          `).bind(order.Quantity, shipment.id).run();

          // Insert into executedOrder table
          await db.prepare(`
            INSERT INTO executedOrderData (orderId, farm_name, size, quantity)
            VALUES (?, ?, ?, ?)
          `).bind(order.orderId, shipment.farm_name, productSize, order.Quantity).run();

          // Update order status to allocated
          await db.prepare(`
            UPDATE uploadedOrderData
            SET status = 'allocated'
            WHERE id = ?
          `).bind(order.orderId).run();

          executedOrders.push({
            orderId: order.orderId,
            farm_name: shipment.farm_name,
            size: productSize,
            quantity: order.Quantity,
          });

          allocated = true;
          order.status = 'allocated'; // Update the order object for frontend
          break;
        }
      }

      // If not allocated, mark the order as stock_shortage
      if (!allocated) {
        await db.prepare(`
          UPDATE uploadedOrderData
          SET tagType = 'stock_shortage',status = 'pending'
          WHERE id = ?
        `).bind(order.orderId).run();

        order.tagType = 'stock_shortage'; // Update the order object for frontend
      }
    }

    // Return updated orders list and executed orders to frontend
    return c.json({
      status: 'Orders allocated successfully',
      orders: orders.results,
      executedOrders,
    }, 200);
  } catch (error) {
    console.error('Error executing allocation:', error);
    return c.json({ status: 'Error allocating orders', error: error.message }, 500);
  }
});

// Fetch executed order data
app.options('/executedOrders', async (c) => {
  // Set CORS headers for preflight request
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200);
});

app.get('/executedOrders', async (c) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');

  const result = await c.env.DB.prepare("SELECT *, m.perfecture FROM uploadedOrderData u JOIN masterData m ON m.'orderID' = u.'CustomerCode' WHERE u.status IS NOT 'new'" )
  .all();


  return c.json({result}, 200);
});

// Allocate delivery dates
app.options('/allocateDeliveryDate', async (c) => {
  // Set CORS headers for preflight request
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200);
});

app.get('/allocateDeliveryDate', async (c) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');

  // const result = await c.env.DB.prepare("SELECT u.*, m.perfecture FROM uploadedOrderData u JOIN masterData m ON m.'orderID' = u.'CustomerCode' WHERE u.SystemUploadDate >= DATETIME('now', 'localtime', 'start of day');" )
  // .all();

  const records = await c.env.DB.prepare(`SELECT *,  CASE WHEN p.category = 'A' THEN DATE('now', '+2 days')  WHEN p.category = 'B' THEN DATE('now', '+2 days')  WHEN p.category = 'C' THEN DATE('now', '+3 days') END AS DesiredDeliveryDate,  CASE WHEN p.category = 'A' THEN '08:00-12:00'  WHEN p.category = 'B' THEN '14:00-16:00'  WHEN p.category = 'C' THEN '08:00-12:00' END AS DesiredDeliveryTime  FROM uploadedOrderData u  JOIN masterData m ON u.CustomerCode = m.orderID  JOIN jfMaster p ON m.perfecture = p.location  WHERE (u.DesiredDeliveryDate IS NULL OR u.DesiredDeliveryTime IS NULL)  AND u.OrderDate < DATETIME('now', 'start of day', '+13 hours')`).all();

  console.log(records);

  if (records.results.length === 0) {
    console.log('No records to update.');
  } else {
    for (const record of records.results) {
      // Update each record individually
      await c.env.DB.prepare(`
        UPDATE uploadedOrderData
        SET 
          DesiredDeliveryDate = ?, 
          DesiredDeliveryTime = ?
        WHERE id = ?
      `)
        .bind(record.DesiredDeliveryDate, record.DesiredDeliveryTime, record.id)
        .run();
    }
    console.log(`${records.results.length} records updated successfully.`);
  }
  
  // Fetch the updated records for verification or return to the frontend
  const updatedRecords = await c.env.DB.prepare(`
    SELECT * FROM uploadedOrderData
    WHERE id IN (${records.results.map(r => r.id).join(', ')})
  `).all();
  
  console.log(updatedRecords);

  return c.json({updatedRecords}, 200);
});

app.options('/masterData', async (c) => {
  // Set CORS headers for preflight request
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200);
});

app.post('/masterData', async (c) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');

  console.log("inside master data request")

  try {
    console.log("inside try block")
    const body = await c.req.json();
    // const data = body.data;  // JSON array of masterdata entries
    const {formattedData} = body;
    const data = formattedData
    console.log("data",formattedData,data)

    if (!data || !Array.isArray(data) || data.length === 0) {
      return c.json({ message: 'Invalid or missing data array' }, 400);
    }

    // Generate a filename with the current timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Format timestamp for file
    const fileName = `masterdata_${timestamp}`;
    const fileSize = 2;
    const uploadStatus = "Success";

    // Insert entry into masterdatametadata
    const metadataResult =  await c.env.DB.prepare(`
      INSERT INTO mastermetadata (fileName, uploadDate, uploadStatus, fileSize)
      VALUES (?, CURRENT_TIMESTAMP, ?, ?)
    `)
    .bind(fileName, uploadStatus, fileSize)
    .run();


    if (!metadataResult.success) {
      return c.json({ message: 'Failed to insert metadata', error: metadataResult.error }, 500);
    }

    // Prepare the SQL for inserting multiple entries into masterdata
    const insertStatement = c.env.DB.prepare(`
      INSERT OR REPLACE INTO masterdata (
        orderID, companyName, zipCode, perfecture, address, apartmentName, 
        customerRank, isAlternativeVariety, isAlternativeSize, 
        prohibitedVarieties, prohibitedFarms, fileName
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Insert each item in the array with the filename reference
    for (const item of data) {
      const values = [
        item.orderID, item.companyName, item.zipCode, item.perfecture, item.address,
        item.apartmentName, item.customerRank, item.isAlternativeVariety,
        item.isAlternativeSize, item.prohibitedVarieties, item.prohibitedFarms, fileName
      ];

      const result = await insertStatement.bind(...values).run();
      if (!result.success) {
        return c.json({ message: 'Failed to insert masterdata entry', error: result.error }, 500);
      }
    }

    return c.json({ message: 'Masterdata entries inserted successfully!', fileName }, 200);
  } catch (error) {
    console.error('Error inserting data into masterdata:', error);
    return c.json({ message: 'Error processing request', error }, 500);
  }
});
app.options('/productMaster', async (c) => {
  // Set CORS headers for preflight request
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200);
});
app.post('/productMaster', async (c) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');

  console.log("inside master data request")

  try {
    console.log("inside try block")
    const body = await c.req.json();
    // const data = body.data;  // JSON array of masterdata entries
    const {formattedData} = body;
    const data = formattedData
    console.log("data",formattedData,data)

    if (!data || !Array.isArray(data) || data.length === 0) {
      return c.json({ message: 'Invalid or missing data array' }, 400);
    }

    // Generate a filename with the current timestamp
    // const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Format timestamp for file
    // const fileName = `masterdata_${timestamp}`;
    // const fileSize = 2;
    // const uploadStatus = "Success";

    // Insert entry into masterdatametadata
    // const metadataResult =  await c.env.DB.prepare(`
    //   INSERT INTO mastermetadata (fileName, uploadDate, uploadStatus, fileSize)
    //   VALUES (?, CURRENT_TIMESTAMP, ?, ?)
    // `)
    // .bind(fileName, uploadStatus, fileSize)
    // .run();


    // if (!metadataResult.success) {
    //   return c.json({ message: 'Failed to insert metadata', error: metadataResult.error }, 500);
    // }

    // Prepare the SQL for inserting multiple entries into masterdata
    const insertStatement = c.env.DB.prepare(`
      INSERT OR REPLACE INTO productMaster (
        product_code, product_name, size, quality, rule001, rule002, rule003,
    rule004, rule005, rule006, rule007, rule008
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Insert each item in the array with the filename reference
    for (const item of data) {
      const values = [
        item.product_code, item.product_name, item.size, item.quality,
        item.rule001, item.rule002, item.rule003, item.rule004,
        item.rule005, item.rule006, item.rule007, item.rule008
      ];

      const result = await insertStatement.bind(...values).run();
      if (!result.success) {
        return c.json({ message: 'Failed to insert masterdata entry', error: result.error }, 500);
      }
    }

    return c.json({ message: 'Masterdata entries inserted successfully!' }, 200);
  } catch (error) {
    console.error('Error inserting data into masterdata:', error);
    return c.json({ message: 'Error processing request', error }, 500);
  }
});
app.options('/jfMaster', async (c) => {
  // Set CORS headers for preflight request
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200);
});
app.post('/jfMaster', async (c) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');

  console.log("inside master data request")

  try {
    console.log("inside try block")
    const body = await c.req.json();
    // const data = body.data;  // JSON array of masterdata entries
    const {formattedData} = body;
    const data = formattedData
    console.log("data",formattedData,data)

    if (!data || !Array.isArray(data) || data.length === 0) {
      return c.json({ message: 'Invalid or missing data array' }, 400);
    }

    // Generate a filename with the current timestamp
    // const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Format timestamp for file
    // const fileName = `masterdata_${timestamp}`;
    // const fileSize = 2;
    // const uploadStatus = "Success";

    // Insert entry into masterdatametadata
    // const metadataResult =  await c.env.DB.prepare(`
    //   INSERT INTO mastermetadata (fileName, uploadDate, uploadStatus, fileSize)
    //   VALUES (?, CURRENT_TIMESTAMP, ?, ?)
    // `)
    // .bind(fileName, uploadStatus, fileSize)
    // .run();


    // if (!metadataResult.success) {
    //   return c.json({ message: 'Failed to insert metadata', error: metadataResult.error }, 500);
    // }

    // Prepare the SQL for inserting multiple entries into masterdata
    const insertStatement = c.env.DB.prepare(`
      INSERT OR REPLACE INTO jfMaster (
    arrival_time, location, category
  ) VALUES (?, ?, ?)
    `);

    // Insert each item in the array with the filename reference
    for (const item of data) {
      const values = [
        item.arrival_time, item.location, item.category
      ];

      const result = await insertStatement.bind(...values).run();
      if (!result.success) {
        return c.json({ message: 'Failed to insert masterdata entry', error: result.error }, 500);
      }
    }

    return c.json({ message: 'Masterdata entries inserted successfully!' }, 200);
  } catch (error) {
    console.error('Error inserting data into masterdata:', error);
    return c.json({ message: 'Error processing request', error }, 500);
  }
});

app.options('/shippingMaster', async (c) => {
  // Set CORS headers for preflight request
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200);
});
app.post('/shippingMaster', async (c) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');

  console.log("inside master data request")

  try {
    console.log("inside try block")
    const body = await c.req.json();
    // const data = body.data;  // JSON array of masterdata entries
    const {formattedData} = body;
    const data = formattedData
    console.log("data",data[0])

    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log("invalid shipping master data")
      return c.json({ message: 'Invalid or missing data array' }, 400);
    }

    // Generate a filename with the current timestamp
    // const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Format timestamp for file
    // const fileName = `masterdata_${timestamp}`;
    // const fileSize = 2;
    // const uploadStatus = "Success";

    // Insert entry into masterdatametadata
    // const metadataResult =  await c.env.DB.prepare(`
    //   INSERT INTO mastermetadata (fileName, uploadDate, uploadStatus, fileSize)
    //   VALUES (?, CURRENT_TIMESTAMP, ?, ?)
    // `)
    // .bind(fileName, uploadStatus, fileSize)
    // .run();


    // if (!metadataResult.success) {
    //   return c.json({ message: 'Failed to insert metadata', error: metadataResult.error }, 500);
    // }

    // Prepare the SQL for inserting multiple entries into masterdata
    const insertStatement = c.env.DB.prepare(`
      INSERT OR REPLACE INTO shippingMaster (
    FarmCode, FarmName, 北海道, 青森, 岩手, 宮城, 秋田, 山形, 福島, 茨城, 
    栃木, 群馬, 埼玉, 千葉, 東京, 神奈川, 新潟, 富山, 石川, 福井, 山梨, 長野, 
    岐阜, 静岡, 愛知, 三重, 滋賀, 京都, 大阪, 兵庫, 奈良, 和歌山, 鳥取, 島根, 
    岡山, 広島, 山口, 徳島, 香川, 愛媛, 高知, 福岡, 佐賀, 長崎, 熊本, 大分, 
    宮崎, 鹿児島, 沖縄
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

    // Insert each item in the array with the filename reference
    for (const item of data) {
      const values = [
        item.FarmCode, item.FarmName, item.北海道, item.青森, item.岩手, item.宮城,
    item.秋田, item.山形, item.福島, item.茨城, item.栃木, item.群馬, item.埼玉,
    item.千葉, item.東京, item.神奈川, item.新潟, item.富山, item.石川, item.福井,
    item.山梨, item.長野, item.岐阜, item.静岡, item.愛知, item.三重, item.滋賀,
    item.京都, item.大阪, item.兵庫, item.奈良, item.和歌山, item.鳥取, item.島根,
    item.岡山, item.広島, item.山口, item.徳島, item.香川, item.愛媛, item.高知,
    item.福岡, item.佐賀, item.長崎, item.熊本, item.大分, item.宮崎, item.鹿児島,
    item.沖縄
      ];

      const result = await insertStatement.bind(...values).run();
      if (!result.success) {
        console.log("failed to insert shipping master")
        return c.json({ message: 'Failed to insert masterdata entry', error: result.error }, 500);
      }
    }
    console.log("successfully inserted shipping master")

    return c.json({ message: 'Masterdata entries inserted successfully!' }, 200);
  } catch (error) {
    console.error('Error inserting data into masterdata:', error);
    return c.json({ message: 'Error processing request', error }, 500);
  }
});

app.options('/heightMaster', async (c) => {
  // Set CORS headers for preflight request
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200);
});
app.post('/heightMaster', async (c) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');

  console.log("inside master data request")

  try {
    console.log("inside try block")
    const body = await c.req.json();
    // const data = body.data;  // JSON array of masterdata entries
    const {formattedData} = body;
    const data = formattedData
    console.log("data",formattedData,data)

    if (!data || !Array.isArray(data) || data.length === 0) {
      return c.json({ message: 'Invalid or missing data array' }, 400);
    }

    // Generate a filename with the current timestamp
    // const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Format timestamp for file
    // const fileName = `masterdata_${timestamp}`;
    // const fileSize = 2;
    // const uploadStatus = "Success";

    // Insert entry into masterdatametadata
    // const metadataResult =  await c.env.DB.prepare(`
    //   INSERT INTO mastermetadata (fileName, uploadDate, uploadStatus, fileSize)
    //   VALUES (?, CURRENT_TIMESTAMP, ?, ?)
    // `)
    // .bind(fileName, uploadStatus, fileSize)
    // .run();


    // if (!metadataResult.success) {
    //   return c.json({ message: 'Failed to insert metadata', error: metadataResult.error }, 500);
    // }

    // Prepare the SQL for inserting multiple entries into masterdata
    const insertStatement = c.env.DB.prepare(`
        INSERT OR REPLACE INTO heightMaster (
    FarmCode, FarmName, SizeXXcm, 優先, S, M, 訳あり小, L, size2L, size3L, size4L, 訳あり中,
    size5L, 訳あり大
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

    // Insert each item in the array with the filename reference
    for (const item of data) {
      const values = [
        item.FarmCode, item.FarmName, item.SizeXXcm, item.優先, item.S, item.M, item.訳あり小,
        item.L, item['2L'], item['3L'], item['4L'], item.訳あり中, item['5L'], item.訳あり大
      ];

      const result = await insertStatement.bind(...values).run();
      if (!result.success) {
        return c.json({ message: 'Failed to insert masterdata entry', error: result.error }, 500);
      }
    }

    return c.json({ message: 'Masterdata entries inserted successfully!' }, 200);
  } catch (error) {
    console.error('Error inserting data into masterdata:', error);
    return c.json({ message: 'Error processing request', error }, 500);
  }
});

app.options('/shippingDaysMaster', async (c) => {
  // Set CORS headers for preflight request
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200);
});
app.post('/shippingDaysMaster', async (c) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');

  console.log("inside master data request")

  try {
    console.log("inside try block")
    const body = await c.req.json();
    // const data = body.data;  // JSON array of masterdata entries
    const {formattedData} = body;
    const data = formattedData
    console.log("data",formattedData,data)

    if (!data || !Array.isArray(data) || data.length === 0) {
      return c.json({ message: 'Invalid or missing data array' }, 400);
    }

    // Generate a filename with the current timestamp
    // const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Format timestamp for file
    // const fileName = `masterdata_${timestamp}`;
    // const fileSize = 2;
    // const uploadStatus = "Success";

    // Insert entry into masterdatametadata
    // const metadataResult =  await c.env.DB.prepare(`
    //   INSERT INTO mastermetadata (fileName, uploadDate, uploadStatus, fileSize)
    //   VALUES (?, CURRENT_TIMESTAMP, ?, ?)
    // `)
    // .bind(fileName, uploadStatus, fileSize)
    // .run();


    // if (!metadataResult.success) {
    //   return c.json({ message: 'Failed to insert metadata', error: metadataResult.error }, 500);
    // }

    // Prepare the SQL for inserting multiple entries into masterdata
    const insertStatement = c.env.DB.prepare(`
        INSERT INTO shippingDaysMaster (
    FarmCode, FarmName, SizeXXcm, 北海道, 青森, 岩手, 宮城, 秋田, 山形, 福島, 茨城, 
    栃木, 群馬, 埼玉, 千葉, 東京, 神奈川, 新潟, 富山, 石川, 福井, 山梨, 長野, 
    岐阜, 静岡, 愛知, 三重, 滋賀, 京都, 大阪, 兵庫, 奈良, 和歌山, 鳥取, 島根, 
    岡山, 広島, 山口, 徳島, 香川, 愛媛, 高知, 福岡, 佐賀, 長崎, 熊本, 大分, 
    宮崎, 鹿児島, 沖縄
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

    // Insert each item in the array with the filename reference
    for (const item of data) {
      const values = [
        item.FarmCode, item.FarmName, item.SizeXXcm, item.北海道, item.青森, item.岩手, item.宮城,
        item.秋田, item.山形, item.福島, item.茨城, item.栃木, item.群馬, item.埼玉, item.千葉,
        item.東京, item.神奈川, item.新潟, item.富山, item.石川, item.福井, item.山梨, item.長野,
        item.岐阜, item.静岡, item.愛知, item.三重, item.滋賀, item.京都, item.大阪, item.兵庫,
        item.奈良, item.和歌山, item.鳥取, item.島根, item.岡山, item.広島, item.山口, item.徳島,
        item.香川, item.愛媛, item.高知, item.福岡, item.佐賀, item.長崎, item.熊本, item.大分,
        item.宮崎, item.鹿児島, item.沖縄
      ];

      const result = await insertStatement.bind(...values).run();
      if (!result.success) {
        return c.json({ message: 'Failed to insert masterdata entry', error: result.error }, 500);
      }
    }

    return c.json({ message: 'Masterdata entries inserted successfully!', fileName }, 200);
  } catch (error) {
    console.error('Error inserting data into masterdata:', error);
    return c.json({ message: 'Error processing request', error }, 500);
  }
});


app.options('/getUploadedMasterData', async (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200); 
});

app.options('/getDeliveryDate', async (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200); 
});

// Get uploaded orders with pagination
app.get('/getUploadedMasterData', async (c) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET');
  c.header('Access-Control-Allow-Headers', '*');

  const page = parseInt(c.req.query('page') || '1', 10);
  const pageSize = parseInt(c.req.query('pageSize') || '10', 10);

  // Calculate offset and limit
  const offset = (page - 1) * pageSize;

  try {
    // Get the total count of records
    const countResult = await c.env.DB.prepare(`SELECT COUNT(*) as count FROM masterdata`).first<{ count: number }>();
    if (!countResult || countResult.count === undefined) {
      return c.json({ message: 'Error fetching total count' }, 500);
    }
    const totalCount = countResult.count;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Fetch the paginated data
    const orders = await c.env.DB.prepare(`
      SELECT * FROM masterdata
      LIMIT ? OFFSET ?
    `)
    .bind(pageSize, offset)
    .all();

    return c.json({
      orders: orders,
      pagination: {
        totalPages,
        currentPage: page,
        pageSize,
        totalRecords: totalCount,
      }
    }, 200);
  } catch (error) {
    console.error("Error fetching uploaded orders:", error);
    return c.json({ message: 'Error fetching data', error }, 500);
  }
});

app.options('/getMasterData/:fileName', async (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200); 
});

app.get('/getMasterData/:fileName', async (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET');
  c.header('Access-Control-Allow-Headers', '*');
  const file = c.req.query('fileName') || '';
  const page = parseInt(c.req.query('page') || '1', 10);
  const pageSize = parseInt(c.req.query('pageSize') || '10', 10);

  // Calculate offset and limit
  const offset = (page - 1) * pageSize;
  const { fileName } = c.req.param()
  console.log(c.req.param)
  console.log("Received fileName:", fileName);
  console.log("my file",file);
  

  try {
    // Get the total count of records
    const countResult = await c.env.DB.prepare(`SELECT COUNT(*) as count FROM masterdata  WHERE fileName = ?`).bind(file).first<{ count: number }>();
    if (!countResult || countResult.count === undefined) {
      return c.json({ message: 'Error fetching total count' }, 500);
    }
    const totalCount = countResult.count;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Fetch the paginated data
    const orders = await c.env.DB.prepare(`
      SELECT * FROM masterdata
      WHERE fileName = ?
      LIMIT ? OFFSET ?
    `)
    .bind(file, pageSize, offset)
    .all();
    console.log("orderdata",orders);

    return c.json({
      orders: orders,
      pagination: {
        totalPages,
        currentPage: page,
        pageSize,
        totalRecords: totalCount,
      }
    }, 200);
  } catch (error) {
    console.error("Error fetching uploaded orders:", error);
    return c.json({ message: 'Error fetching data', error }, 500);
  }
})

app.options('/getUploadedMetaData', async (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200); 
});

app.get('/getUploadedMetaData', async (c) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET');
  c.header('Access-Control-Allow-Headers', '*');

  const page = parseInt(c.req.query('page') || '1', 10);
  const pageSize = parseInt(c.req.query('pageSize') || '10', 10);

  // Calculate offset and limit
  const offset = (page - 1) * pageSize;

  try {
    // Get the total count of records
    const countResult = await c.env.DB.prepare(`SELECT COUNT(*) as count FROM mastermetadata`).first<{ count: number }>();
    if (!countResult || countResult.count === undefined) {
      return c.json({ message: 'Error fetching total count' }, 500);
    }
    const totalCount = countResult.count;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Fetch the paginated data
    const orders = await c.env.DB.prepare(`
      SELECT * FROM mastermetadata
      ORDER BY uploadDate DESC
      LIMIT ? OFFSET ?
    `)
    .bind(pageSize, offset)
    .all();

    return c.json({
      orders: orders,
      pagination: {
        totalPages,
        currentPage: page,
        pageSize,
        totalRecords: totalCount,
      }
    }, 200);
  } catch (error) {
    console.error("Error fetching uploaded orders:", error);
    return c.json({ message: 'Error fetching data', error }, 500);
  }
});

app.get('/getMetaData/:fileName', async (c) => {
  const { fileName } = c.req.param()
  
  try {
    const file = await c.env.FILE_BUCKET.get(fileName)

    if (!file) {
      return c.json({ message: 'File not found please try again' }, 404)
    }

    const fileBuffer = await file.arrayBuffer()
    const contentType = file.httpMetadata?.contentType || 'application/octet-stream';
    return new Response(fileBuffer, {
      headers: { 'Content-Type': contentType }
    })
  } catch (error) {
    return c.json({ message: 'Error fetching file', error: error }, 500)
  }
})



export default app