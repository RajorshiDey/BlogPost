require('./db');

const userSchema = mongoose.Schema({
    username: String,
    email: String,
    password: String,
    //creating post field to store reference id of posts done by the user 
    posts: [{type: mongoose.Schema.Types.ObjectId, ref: "post"}]
})

module.exports = mongoose.model('user', userSchema);