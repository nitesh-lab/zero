import express from "express";
import bodyparser from "body-parser";
import axios from "axios";
import pg from "pg";

const db=new pg.Client({
     user: 'try_u9ab_user',
  host: 'dpg-cld5g13mot1c73dlfdv0-a',
  database: 'try_u9ab',
    password:'nCx3fcjDZeyLGstSxsmLDDnVVgNwZEog',
    port:5432
})

db.connect();
const app=express();

app.use(express.static("public"));
app.use(bodyparser.urlencoded({extended:true}));
app.use(express.json());


app.get("/index",(req,res)=>{
  res.render("login.ejs");
})


app.get("/",async(req,res)=>{
    res.render("login.ejs");
})



app.post("/sign",async(req,res)=>
  {    
   var name=req.body["uname"];
   var pass=req.body["password"];
   console.log(name);
   console.log(pass);
    try{
    const response=await db.query("insert into record(uname,password) values($1,$2)RETURNING *",[name,pass]);
    console.log("going");
    return res.json({redir:"/"});  
}
    catch(e){
        console.log(e);
    }       
});

app.post("/login",async(req,res,next)=>{
   var name=req.body["uname"];
   var pass=req.body["password"];
   const response=await db.query("select * from record where uname=$1 and password=$2",[name,pass]);
   console.log(response.rows[0]);   
   if(response.rows[0]){   //if login successfull then insert value of current date into table
    const response=await axios.get("http://worldtimeapi.org/api/timezone/Asia/Kolkata");   
    console.log(response.data);
    console.log(response.data.datetime.slice(8,10));
    var month=new Date().getMonth();
    console.log("month="+month);
   try{
   const response2=await db.query("insert into streak(date,uname)values($1,$2)returning uname",[response.data.datetime.slice(8,10),name]);
   console.log(response2.rows[0]);
   console.log("return");
   
   return res.json({redir:"/home?uname="+name}); } 
   catch(error){
        if(error.code==23505){
            console.log("duplicate key error");
            res.json({redir:"/home?uname="+name});
        }
    }  
}     
// if login unsuccessfull then
else{
        return res.json({redir:"/",messsage:"Failed to Login"});
    }
    
})

//custom middlware

const logger=(req,res,next)=>{
res.locals.data=req.query.uname;
next();
}

app.get("/home", logger, async (req, res) => {
    var a = [];
    const response = await db.query("select date from streak where uname=$1", [res.locals.data]);
    response.rows.forEach((e) => {
      a.push(e.date);
    });

    const response2=await db.query("select seconds,minutes,hours from time where uname=$1",[res.locals.data]);
    
    var total=0;
    var seconds=0;
    var minutes=0;
    var hours=0;
    response2.rows.forEach((e)=>{
      seconds+=parseInt(e.seconds,10);
      minutes+=parseInt(e.minutes,10);
      hours+=parseInt(e.hours,10);
    })
    
    seconds=seconds/60;
    hours=hours*60;

    total=Math.floor(minutes+hours+seconds);
    console.log("total="+total);

    var b=JSON.stringify(a);
    res.render("index.ejs", { val: "a", date: b,streak:a.length,uname:res.locals.data,total:total});
    
  });

  app.get("/timer",logger,(req,res)=>{
    //console.log(res.locals.data);
    res.render("timer.ejs",{uname:res.locals.data});
  })

  app.post("/time",async(req,res)=>{
    var seconds=req.body["seconds"];
    var minutes=req.body["minutes"];
    var hours=req.body["hours"];
    var uname=req.body["uname"];
    try{
    const response= await db.query("insert into time(seconds,minutes,hours,uname)values($1,$2,$3,$4)returning id",[seconds,minutes,hours,uname]);
    //console.log(response.rows[0].id);
    }
    catch(error){
      console.log(error);
    }
    const response2=await db.query("select *from time");
    console.log(response2.rows.length);
     
    res.sendStatus(200);
  })

app.get("/schedule",logger,async(req,res)=>{
  console.log(res.locals.data);
  const response2=await db.query("select id,schedule from schedule where uname=$1",[res.locals.data]);
 var schedule=JSON.stringify(response2.rows);
  res.render("schedule.ejs",{uname:res.locals.data,schedule:schedule});
})


app.post("/todo",logger,async(req,res)=>{
  var uname=res.locals.data;
  var data=req.body["data"];
  const response=await db.query("insert into schedule(schedule,uname) values($1,$2)returning *",[data,uname]);
  //console.log(response.rows[0].id);
  const response2=await db.query("select schedule from schedule where id=$1",[response.rows[0].id]);
  const date=new Date();
  var dat=date.getDate();
  var month=date.getMonth()+1;
  var year=date.getFullYear();
  const response3=await db.query("insert into todo(date,mth,yr,task,uname)values($1,$2,$3,$4,$5) returning id",[dat,month,year,data,uname]);
  console.log("inserted at"+response3.rows[0].id);
  res.json({id:response.rows[0].id,schedule:response2.rows[0].schedule});
})

app.post("/delete",logger,async(req,res)=>{
  var uname=res.locals.data;
  var id=req.body["id"];
  const response=await db.query("delete from schedule where id=$1 returning id,schedule",[id]);
  var date=new Date();
  var dat=date.getDate();
  var month=date.getMonth();
  var year=date.getFullYear();
  //console.log(response.rows[0].schedule);
  const response3=await db.query("delete from todo where task=$1 returning id",[response.rows[0].schedule]);
  console.log("deleted at"+response3.rows[0].id);
  res.json({messsage:response.rows[0].id});
})


app.post("/date",async(req,res)=>{
  var date=req.body["data"];
  var uname=req.body["name"];
var result=date.split("/");
console.log(result[0]);
console.log(result[1]);
console.log(result[2]);
console.log(uname);
var response=await db.query("select task from todo where date=$1 and mth=$2 and yr=$3 and uname=$4",[result[0],result[1],result[2],uname]);
  var data=response.rows;
  console.log(data[0]);
  res.json({"load":"next",d:data});
})

app.get("/next",(req,res)=>{
      var d=JSON.parse(req.query.data);
     res.render("date.ejs",{data:JSON.stringify(d)});
})

app.listen(process.env.PORT || 3000,()=>{
    console.log("listening to port 3000");
})
 
