const express = require('express');
const app = express(); //Creating instance of express
const userModel = require('./models/user');
const postModel = require('./models/post')
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const secret_key = process.env.JWT_SECRET;
require('./models/db');   


app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());





//------------------------------------------------------s---GET ROUTES----------z----s-----------------------------------------
app.get('/', isLoggedIn, async (req, res) => {
    const posts = await postModel
        .find({})
        .populate('user')        // attach user info
        .sort({ date: -1 });     // latests first
    
    let user = await userModel.findOne({ email: req.user.email }).populate('posts');
        

    res.render("home", { posts, user });
});


app.get('/home', isLoggedIn, async (req, res) => {
    const posts = await postModel
        .find({})
        .populate('user')
        .sort({ date: -1 });
        // console.log(posts);
    let user = await userModel.findOne({ email: req.user.email }).populate('posts');

    res.render("home", { posts, user });
});


app.get('/myposts', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email }).populate('posts');
    // console.log(user);
    res.render("myposts", {user});
});

app.get('/create', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email });
    // console.log(user);
    res.render("create");
});

app.get('/like/:id', isLoggedIn, async (req, res) => {
    const post = await postModel.findById(req.params.id);

    if (!post) return res.redirect('/home');

    const userId = req.user.userid;

    const alreadyLiked = post.likes.some(
        id => id.toString() === userId
    );

    if (alreadyLiked) {
        // unlike
        post.likes = post.likes.filter(
            id => id.toString() !== userId
        );
    } else {
        // like
        post.likes.push(userId);
    }

    await post.save();
    res.redirect('/home');
});


app.get('/likemy/:id', isLoggedIn, async (req, res) => {
    const post = await postModel.findById(req.params.id);

    if (!post) return res.redirect('/myposts');

    const userId = req.user.userid;

    const alreadyLiked = post.likes.some(
        id => id.toString() === userId
    );

    if (alreadyLiked) {
        post.likes = post.likes.filter(
            id => id.toString() !== userId
        );
    } else {
        post.likes.push(userId);
    }

    await post.save();
    res.redirect('/myposts');
});


app.get('/edit/:id', isLoggedIn ,async (req, res) => {
    let post = await postModel.findOne({_id: req.params.id}).populate('user');
    console.log(post);
    if (req.user.userid == post.user._id){
        res.render("edit", {post});
    }
    else {
        res.redirect("/home");
    }
})

// -------------------- DELETE POST --------------------
app.get('/delete/:id', isLoggedIn, async (req, res) => {
    try{
        let post = await postModel.findById(req.params.id);

        // security check: only owner can delete
        if(post.user.toString() !== req.user.userid){
            return res.redirect("/home");
        }

        // remove post id from user's posts array
        await userModel.findByIdAndUpdate(post.user, {
            $pull: { posts: post._id }
        });

        // delete post from database
        await postModel.findByIdAndDelete(req.params.id);

        res.redirect("/home");
    }
    catch(err){
        console.log(err);
        res.redirect("/home");
    }
});


app.get('/login', (req, res) => {
    res.render("login");
})

app.get('/register', (req, res) => {
    res.render("index");
})

// ---------------------------------------------------/register---------------------------------------------------------------------
app.post('/register', async (req, res) => {
    //destructuring variables
    let { username, email, password } = req.body;

    //Checking if user already exists with same email
    let user = await userModel.findOne({ email })
    if (user) {
        return res.status(500).redirect("/login");
    }

    //Hashing the password (encrypting)
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            //creating and storing data in userModel (DB)
            user = await userModel.create({
                username,
                email,
                password: hash
            })
            //convert email into jwt tokens and store it in cookies
            let token = jwt.sign({ email: email, userid: user._id }, secret_key);
            res.cookie("token", token);
            //rendering to home page
            res.redirect("/home");
        })
    });
});
// -----------------------------------------------------------------------------------------------------------------------------------


// ---------------------------------------------------/login---------------------------------------------------------------------
app.post('/login', async (req, res) => {
    //destructuring variables (we dont need username since we will just check for email and password)
    let { email, password } = req.body;

    //Checking if user already exists with same email
    let user = await userModel.findOne({ email })
    if (!user) {
        return res.status(500).send("Incorrect password or email");
    }

    //Checking the new password with the old encrypted password stored in DB
    bcrypt.compare(password, user.password, (err, result) => {
        if (result) {
            let token = jwt.sign({ email: user.email, userid: user._id }, secret_key);
            res.cookie("token", token);
            return res.redirect("/home");
        }

        else {
            res.redirect("/login");
        }
    });
});
// -----------------------------------------------------------------------------------------------------------------------------------

// ---------------------------------------------------/logout-------------------------------------------------------------------------
app.get('/logout', (req, res) => {
    res.cookie("token", "");
    res.redirect("/login");
})
// ---------------------------------------------------------------------------------------------------------------------------------

// ---------------------------------------------------/post--------------------------------------------------------
app.post('/post', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({email : req.user.email});
    let {content} = req.body;
    let post = await postModel.create({
        user: req.user.userid,
        content,
    })

    user.posts.push(post._id);
    await user.save();
    res.redirect('/home');
});
// --------------------------------------------------------------------------------------------------

app.post('/update/:id', isLoggedIn, async (req, res) => {
    let post = await postModel.findOneAndUpdate({_id: req.params.id}, {content: req.body.content});
    res.redirect("/home")
});

//-----------------------------------------------------MIDDLE-WARE------------------------------------------------------------
function isLoggedIn(req, res, next) {
    const token = req.cookies.token;

    //No token at all
    if (!token) {
        return res.redirect("/register");
    }

    try {
        //Verify token
        const data = jwt.verify(token, secret_key);
        req.user = data;
        console.log(data);
        next();
    } catch (err) {
        //Invalid or expired token
        res.clearCookie("token");
        return res.redirect("/register");
    }
}

//---------------------------------------------------------------------------------------------------------------------



const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
