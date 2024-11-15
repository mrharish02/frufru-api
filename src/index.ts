import { Hono } from 'hono'
import { parse } from 'exceljs';

type Env = {
  FILE_BUCKET: R2Bucket;
  DB: D1Database;
};


const app = new Hono<{ Bindings: Env }>()

app.get('/', (c) => {
  return c.text('Hello Hono!')
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




app.options('/uploadOrderData', async (c) => {
  // Set CORS headers for preflight request
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200);
});

// Upload a file to R2
app.post('/uploadOrderData', async (c) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'POST');
  c.header('Access-Control-Allow-Headers', '*');
  
  const form = await c.req.formData();
  const file = form.get("file");
  
  if (file instanceof File) {
    const buffer = await file.arrayBuffer();
    const fileName = file.name;
    const fileSize = buffer.byteLength;
    const uploadStatus = "Success";

    // // Step 1: Upload the file to R2 bucket
    // await c.env.FILE_BUCKET.put(fileName, buffer);

    // Step 2: Insert file details into `orderdata` table
    const insertFileResult = await c.env.DB.prepare(`
      INSERT INTO orderdata (fileName, uploadDate, uploadStatus, fileSize)
      VALUES (?, CURRENT_TIMESTAMP, ?, ?)
    `)
    .bind(fileName, uploadStatus, fileSize)
    .run();

    if (!insertFileResult.success) {
      return c.json({ message: "Failed to insert file data", error: insertFileResult.error }, 500);
    }

    // Get the fileId of the newly inserted file
    const fileId = insertFileResult.lastInsertRowId;

    // Step 3: Parse the Excel file contents
    const workbook = new parse.Workbook();
    await workbook.xlsx.load(Buffer.from(buffer));

    // Assuming data is in the first worksheet and starts from the second row
    const worksheet = workbook.worksheets[0];
    const orders:any = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {  // Skip the header row
        const order = {
          SystemUploadDate: new Date(),
          OrderDate: row.getCell(1).value,
          OrderNo: row.getCell(2).value,
          ProductCode: row.getCell(3).value,
          Quantity: row.getCell(4).value,
          CustomerCode: row.getCell(5).value,
          Message: row.getCell(6).value,
          DesiredDeliveryDate: row.getCell(7).value,
          DesiredDeliveryTime: row.getCell(8).value,
          fileId: fileId
        };
        orders.push(order);
      }
    });

    // Step 4: Insert all rows into `uploadedOrderData` table in bulk
    const insertPromises = orders.map(order => {
      return c.env.DB.prepare(`
        INSERT INTO uploadedOrderData 
          (SystemUploadDate, OrderDate, OrderNo, ProductCode, Quantity, CustomerCode, Message, DesiredDeliveryDate, DesiredDeliveryTime, fileId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        order.SystemUploadDate,
        order.OrderDate,
        order.OrderNo,
        order.ProductCode,
        order.Quantity,
        order.CustomerCode,
        order.Message,
        order.DesiredDeliveryDate,
        order.DesiredDeliveryTime,
        order.fileId
      )
      .run();
    });

    try {
      await Promise.all(insertPromises);
      return c.json({ message: "File uploaded and data stored successfully!" }, 200);
    } catch (error) {
      return c.json({ message: "Error inserting order data", error }, 500);
    }
  } else {
    return c.json({ error: "No file uploaded" }, 400);
  }
});


app.options('/getUploadedOrders', async (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200); // Empty response with 204 status
});

// Get uploaded orders with pagination
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

app.get('/getOrderData/:fileName', async (c) => {
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
  return c.json({}, 200); // Empty response with 204 status
});

app.options('/getDeliveryDate', async (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  return c.json({}, 200); // Empty response with 204 status
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
  return c.json({}, 200); // Empty response with 204 status
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
  return c.json({}, 200); // Empty response with 204 status
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

// Get a file from R2
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