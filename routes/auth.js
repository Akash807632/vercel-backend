const express = require('express')
const User = require('../models/User')
const { body, validationResult } = require('express-validator');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
const fetchuser = require('../midleware/fetchuser')
// const createerror = require('../utiles/err')
const router = express.Router()
const JWT_SECRET = "screate"

//create
router.post('/CreateU', [
    body('name').isLength({ min: 3 }),
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
], async (req, res) => {
    const newuser = new User(req.body)
    const errors = validationResult(req);
    if (!errors.isEmpty()) { return res.status(400).json(errors.array()) }
    try {
        let user = await User.findOne({ email: req.body.email })
        if (user) return res.status(400).json({ error: "user already exist" })


        const salt = await bcrypt.genSalt(10)
        let secure = await bcrypt.hash(req.body.password, salt)

        user = await User.create({
            email: req.body.email,
            name: req.body.name,
            password: secure
        })
        //creating data
        const data = {
            User: {
                id: user.id
            }
        }
        var Token = jwt.sign(data, JWT_SECRET)
        res.json({ user, Token })
    } catch (err) {
        console.error(err.message);
        res.status(500).send("internal server error");
    }
})


//Authenticate user
router.post('/authenticate',[
    body('email').isEmail(),
    body('password').isLength({ min: 8 })
],async (req,res)=>{

    const errors = validationResult(req);
    if(!errors.isEmpty()){return res.status(500).json(errors.array())}
    const {email,password}= req.body;
    try {
        let user = await User.findOne({ email: email })
        if(!user){return res.status(400).json({error:"invalid email"})}
        const valid = await bcrypt.compare(password,user.password);
        if(!valid){return res.status(400).json({error:"invalid password"})}

        const data = {
            User:{
                id:user.id
            }
        }
        var Token = jwt.sign(data,JWT_SECRET)
        res.json({user,Token})
    } catch (error) {
        res.status(500).json("internal error")
    }
})


router.post('/getuser',fetchuser,async (req,res)=>{
  
    try {
      let userid = req.user.id
      const user = await User.findById(userid).select('-password')
      res.send(user);
    } catch (error) {
      console.error(error.message);
      res.status(500).send("internal error");
    }
    })
    
    
module.exports = router