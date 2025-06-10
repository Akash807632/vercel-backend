const express = require('express')
const Portfolio = require('../models/Portfolio')
const router = express.Router()
const axios = require('axios')
const fs = require('fs');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const fetchuser = require('../midleware/fetchuser')
const { body, validationResult } = require('express-validator');
const { findById } = require('../models/User')
const API_KEY = "ZZEVRVN9I5UABETB";

router.get('/getall',fetchuser,async (req,res)=>{
    try {
        const stocks = await Portfolio.find({user : req.user.id})
        res.json(stocks)
    } catch (error) {
        console.log('error at get');
    }

})

router.post('/CreateS', fetchuser, async (req, res) => {
    try {
        const { symbol, quantity, price, name } = req.body;
        if (!price) return res.status(400).json({ error: "Price is required" });

        let userId = req.user.id;
        let stock = await Portfolio.findOne({ user: userId, symbol });

        if (stock) {
            
            let newQuantity = stock.quantity + quantity;
            let newAvgPrice = ((stock.purchasePrice * stock.quantity) + (price * quantity)) / newQuantity;
            
            stock.quantity = newQuantity;
            stock.purchasePrice = newAvgPrice;

            
            stock.transactions.push({ type: "BUY", quantity, price, date: new Date() });

            await stock.save();
            return res.json(stock);
        } else {
            
            const newStock = new Portfolio({
                user: userId,
                symbol:symbol,
                name:name,
                quantity:quantity,
                purchasePrice: price,
                transactions: [{ type: "BUY", quantity, price, date: new Date() }]
            });

            await newStock.save();
            return res.json(newStock);
        }
    } catch (error) {
        console.error("Error at create:", error.message);
        res.status(400).send("Internal error");
    }
});

router.put('/update/:id',fetchuser,async(req,res)=>{
    try {
        const {  quantity,name } = req.body;
        const newstock = {}
        if(quantity){newstock.quantity = quantity}
        if(name){newstock.name = name}
        let stock = await Portfolio.findById(req.params.id)
        if(!stock){res.status(500).json("stock not found")}
        stock.name = name
        stock = await Portfolio.findByIdAndUpdate(req.params.id,{$set:newstock},{new:true})
        res.json(stock)
    } catch (error) {
        console.log("error at update")
        console.error(error.message);
        res.status(400).send('internal error')
    }
})


router.post('/sell', fetchuser, async (req, res) => {
    try {
        const { symbol, quantity, price } = req.body;
        if (!price) return res.status(400).json({ error: "Price is required" });

        let userId = req.user.id;
        let stock = await Portfolio.findOne({ user: userId, symbol });

        if (!stock || stock.quantity < quantity) {
            return res.status(400).json({ error: "Not enough stocks to sell" });
        }

       
        stock.quantity -= quantity;

        
        stock.transactions.push({ type: "SELL", quantity, price, date: new Date() });

      
        if (stock.quantity === 0) {
            await Portfolio.findByIdAndDelete(stock._id);
            return res.json({ message: "Stock fully sold and removed from portfolio" });
        }

        await stock.save();
        res.json(stock);
    } catch (error) {
        console.error("Error at selling:", error.message);
        res.status(400).send("Internal error");
    }
});


router.get("/transactions", fetchuser, async (req, res) => {
    try {
      const userId = req.user.id; // Get user ID from token
  
      // Fetch portfolio entries for the user and extract transactions
      const portfolio = await Portfolio.find({ user: userId });
  
      if (!portfolio || portfolio.length === 0) {
        return res.status(404).json({ message: "No transactions found." });
      }
  
      // Extract transactions from all portfolio items
      let transactions = [];
      portfolio.forEach((stock) => {
        stock.transactions.forEach((txn) => {
          transactions.push({
            symbol: stock.symbol,
            name: stock.name,
            type: txn.type,
            quantity: txn.quantity,
            price: txn.price,
            date: txn.date,
          });
        });
      });
  
      // Sort transactions by date (latest first)
      transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
router.get('/export/:format', fetchuser, async (req, res) => {
    try {
        const userId = req.user.id;
        const stocks = await Portfolio.find({ user: userId });

        const transactions = stocks.flatMap(stock =>
            stock.transactions.map(txn => ({
                symbol: stock.symbol,
                name: stock.name,
                type: txn.type,
                quantity: txn.quantity,
                price: txn.price,
                date: txn.date,
            }))
        );

        if (req.params.format === "csv") {
            const parser = new Parser({ fields: ["symbol", "name", "type", "quantity", "price", "date"] });
            const csv = parser.parse(transactions);

            res.header("Content-Type", "text/csv");
            res.attachment("transactions.csv");
            return res.send(csv);
        } else if (req.params.format === "pdf") {
            const doc = new PDFDocument();
            res.setHeader("Content-Disposition", "attachment; filename=transactions.pdf");
            res.setHeader("Content-Type", "application/pdf");

            doc.pipe(res);
            doc.fontSize(18).text("Transaction History", { align: "center" });

            transactions.forEach(txn => {
                doc.fontSize(12).text(`${txn.date}: ${txn.type} ${txn.quantity} ${txn.symbol} at $${txn.price}`);
            });

            doc.end();
        } else {
            res.status(400).json({ error: "Invalid format. Use 'csv' or 'pdf'." });
        }
    } catch (error) {
        console.error("Export error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
router.get("/trending", async (req, res) => {
    try {
        const response = await axios.get(
            `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${API_KEY}`
        );

        console.log("API Response:", response.data); // ✅ Log response to debug

        if (!response.data || typeof response.data !== "object") {
            return res.status(500).json({ error: "Invalid API response. Check API key or rate limits." });
        }

        res.json(response.data);
    } catch (error) {
        console.error("Error fetching trending stocks:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get('/market-news',async (req,res)=>{
try {
    const response = await axios.get(`https://newsapi.org/v2/everything?q=stock+market&apiKey=2033a9ba9e864c6db2ceeacc04b4068c`);
    res.json(response.data.articles);
} catch (error) {
    console.error("Error fetching news:", error);
    res.status(500).json({ error: "Failed to fetch news" });
}
})
router.get('/History',fetchuser,async (req,res)=>{
    try {
        let userid =req.user.id;
        const Stockhistory = await Portfolio.find({user: userid}).sort({ date: 1 });
        
        res.json(Stockhistory);
        
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "Internal server error" });
    }
})
module.exports = router