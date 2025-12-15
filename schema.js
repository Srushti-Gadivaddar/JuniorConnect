const Joi = require("joi");

module.exports.profileSchema = Joi.object({
    profile: Joi.object({
        name: Joi.string().required(),
        batch: Joi.number().integer().min(0).required(),
        branch: Joi.string().required(),
        role: Joi.string().default('Student'),
        bio: Joi.string().max(200).required(),
        profile_pic: Joi.string().allow("", null).default("https://unsplash.com/photos/a-man-wearing-glasses-and-a-leather-jacket-pt1xSINsAHU")
        
    }).required()
});

module.exports.postSchema = Joi.object({
    post: Joi.object({
        title: Joi.string().required(),
        content: Joi.string().required(),
        image: Joi.alternatives().try(
                Joi.string().allow("", null),
                Joi.object(),Joi.any().optional())
    }).required()
});
