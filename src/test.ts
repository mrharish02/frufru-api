// Upload a file to R2
app.post('/uploadOrderData', async (c) => {

    // Add CORS headers
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Access-Control-Allow-Methods', 'POST');
    c.header('Access-Control-Allow-Headers', '*');
    
      const form = await c.req.formData();
      const file = form.get("file");
      console.log("inside upload file api",file)
      if (file instanceof File) {
        
        const buffer = await file.arrayBuffer();
        const fileName = file.name;
        const fileSize = buffer.byteLength;
        const uploadStatus = "Success";
  
        // Handle the file (upload to R2, save to disk, etc.)
        await c.env.FILE_BUCKET.put(fileName,buffer)
        const result = await c.env.DB.prepare(`
          INSERT INTO orderdata (fileName, uploadDate, uploadStatus, fileSize)
          VALUES (?, CURRENT_TIMESTAMP, ?, ?)
        `)
        .bind(fileName, uploadStatus, fileSize)
        .run();
  
        if (result.success) {
          return c.json({ message: "File uploaded and data stored successfully!" }, 200);
        } else {
          return c.json({ message: "Failed to insert file data", error: result.error }, 500);
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
  
  
  
  // Get a file from R2
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