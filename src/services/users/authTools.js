const jwt = require("jsonwebtoken")
const uniqid = require("uniqid")
const UserModel = require("./model")

const authenticate = async (user) => {
  try {
    // generate tokens
    const newAccessToken = await generateJWT({ _id: user._id })
    const newRefreshToken = await generateRefreshJWT({ _id: user._id }, user.refreshSalt)

    return { token: newAccessToken, refreshToken: newRefreshToken }
  } catch (error) {
    console.log(error)
    throw new Error(error)
  }
}

const generateJWT = (payload) =>
  new Promise((res, rej) =>
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: 86400 },
      (err, token) => {
        if (err) rej(err)
        res(token)
      }
    )
  )

const verifyJWT = (token) =>
  new Promise((res, rej) => {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) rej(err)
      res(decoded)
    })
  }
  )

const verifyRefreshToken = (token) => {

  const salt = token.slice(-8)
  console.log({ salt })
  return new Promise((res, rej) =>
    jwt.verify(token.slice(0, -8), process.env.REFRESH_JWT_SECRET, async (err, decoded) => {
      if (err) rej(err)
      const user = await UserModel.findById(decoded._id)
      console.log({ user, salt })
      user.refreshSalt === salt
        ? res(decoded)
        : rej("Invalid refresh token.")
    })
  )
}

const generateRefreshJWT = (payload, salt) =>
  new Promise((res, rej) =>
    jwt.sign(
      payload,
      process.env.REFRESH_JWT_SECRET,
      { expiresIn: "1 week" },
      (err, token) => {
        if (err) rej(err)
        res(token + salt)
      }
    )
  )

const refreshTokens = async (oldRefreshToken) => {

  const decoded = await verifyRefreshToken(oldRefreshToken)

  const user = await UserModel.findOneAndUpdate({ _id: decoded._id }, {
    refreshSalt: uniqid().slice(-8)
  }, { new: true })

  if (!user) {
    throw new Error(`Access is forbidden`)
  }

  // generate tokens
  const newAccessToken = await generateJWT({ _id: user._id })
  const newRefreshToken = await generateRefreshJWT({ _id: user._id }, user.refreshSalt)

  return { token: newAccessToken, refreshToken: newRefreshToken }
}



module.exports = { authenticate, verifyJWT, refreshTokens }
