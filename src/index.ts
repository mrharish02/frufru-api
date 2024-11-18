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

    const orders:any = [];
    jsonData.forEach((row) => {
      const order = { SystemUploadDate: new Date().toISOString(), OrderDate: row['Order Date'] || null, OrderNo: row['Order No'] || null, ProductCode: row['Product Code'] || null, Quantity: row['Quantity'] || null, CustomerCode: row['Customer Code'] || null, Message: row['Message'] || null, DesiredDeliveryDate: row['Desired Delivery Date'] || null, DesiredDeliveryTime: row['Desired Delivery Time'] || null, fileId: fileId};
      orders.push(order);
    });

    

    // Step 4: Insert all rows into `uploadedOrderData` table in bulk
    const insertPromises = orders.map(order => {
      return c.env.DB.prepare(`
        INSERT INTO uploadedOrderData 
          (SystemUploadDate, OrderDate, OrderNo, ProductCode, Quantity, CustomerCode, Message, DesiredDeliveryDate, DesiredDeliveryTime, status, fileId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind( order.SystemUploadDate, order.OrderDate, order.OrderNo, order.ProductCode, order.Quantity, order.CustomerCode, order.Message, order.DesiredDeliveryDate, order.DesiredDeliveryTime, "pending", order.fileId)
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
    const DesiredDeliveryDate = data.DesiredDeliveryDate ? new Date(data.DesiredDeliveryDate).toISOString().split('T')[0] : null;
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
  c.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
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

    const orders:any = [];
    jsonData.forEach((row) => {
      const order = { SystemUploadDate: new Date().toISOString(), OrderDate: row['Order Date'] || null, OrderNo: row['Order No'] || null, ProductCode: row['Product Code'] || null, Quantity: row['Quantity'] || null, CustomerCode: row['Customer Code'] || null, Message: row['Message'] || null, DesiredDeliveryDate: row['Desired Delivery Date'] || null, DesiredDeliveryTime: row['Desired Delivery Time'] || null, fileId: fileId};
      orders.push(order);
    });

    

    // Step 4: Insert all rows into `uploadedOrderData` table in bulk
    const insertPromises = orders.map(order => {
      return c.env.DB.prepare(`
        INSERT INTO uploadedOrderData 
          (SystemUploadDate, OrderDate, OrderNo, ProductCode, Quantity, CustomerCode, Message, DesiredDeliveryDate, DesiredDeliveryTime, status, fileId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind( order.SystemUploadDate, order.OrderDate, order.OrderNo, order.ProductCode, order.Quantity, order.CustomerCode, order.Message, order.DesiredDeliveryDate, order.DesiredDeliveryTime, "pending", order.fileId)
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

// Get Shipment data with pagination
app.options('/ShipmentData', async (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
      INSERT INTO masterdata (
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