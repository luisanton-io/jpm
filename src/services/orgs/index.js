const router = require("express").Router()
const OrgModel = require("./model")
const { authorize } = require("../auth")

router.get('/', async (req, res, next) => {
    const orgs = OrgModel.find()
    res.status(200).send({ orgs })
})

router.post("/", authorize, async (req, res, next) => {
    try {
        console.log(req.user.email)

        // const newOrg = new OrgModel(req.body)
        // const { _id } = await newOrg.save()
        res.status(201).send({ _id: "OK" })
    } catch (error) {
        next(error)
    }
})


module.exports = router