const User = require("../models/User");
const Note = require("../models/Note");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");

// @desc    Get all users
// @route   GET /users
// @access  Private
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select("-password").lean();

  if (!users?.length) {
    return res.status(404).json({ message: "No users found" });
  }
  res.json(users);
});

// @desc    Create new user
// @route   POST /users
// @access  Private
const createNewUser = asyncHandler(async (req, res) => {
  const { username, password, roles } = req.body;

  // confirm data
  if (!username || !password || !Array.isArray(roles) || !roles.length) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // check for duplicates
  const duplicate = await User.findOne({ username }).lean().exec();
  if (duplicate) {
    return res.status(409).json({ message: "Username already exists" });
  }

  // hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const userObject = {
    username,
    password: hashedPassword,
    roles,
  };

  // create and store new user
  const newUser = await User.create(userObject);

  if (newUser) {
    return res.status(201).json({ message: `User ${username} created` });
  } else {
    return res.status(400).json({ message: "User creation failed" });
  }
});

// @desc    Update user
// @route   PATCH /users/:id
// @access  Private
const updateUser = asyncHandler(async (req, res) => {
  const { id, username, password, roles, active } = req.body;

  // confirm data
  if (
    !id ||
    !username ||
    !password ||
    !Array.isArray(roles) ||
    !roles.length ||
    typeof active !== "boolean"
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const user = await User.findById(id).exec();

  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  // check for duplicates
  const duplicate = await User.findOne({ username }).lean().exec();
  if (duplicate && duplicate?._id.toString() !== id) {
    return res.status(409).json({ message: "Username already exists" });
  }

  user.username = username;
  user.roles = roles;
  user.active = active;

  if (password) {
    user.password = await bcrypt.hash(password, 10);
  }

  const updatedUser = await user.save();

  res.json({ message: `User ${updatedUser.username} updated` });
});

// @desc    Delete user
// @route   DELETE /users/:id
// @access  Private
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  const note = await Note.findOne({ user: id }).lean().exec();

  if (note) {
    return res.status(400).json({ message: "User has notes, cannot delete" });
  }

  const user = await User.findById(id).exec();

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const result = await user.deleteOne();

  const reply = `Username ${result.username} with ID ${result._id} deleted`;

  res.json({ message: reply });
});

module.exports = {
  getAllUsers,
  createNewUser,
  updateUser,
  deleteUser,
};
