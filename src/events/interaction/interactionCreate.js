const interactionHandler = require('../../handlers/interactionHandler');

module.exports = {
    name: 'interactionCreate',
    once: false,
    async execute(interaction, client) {
        await interactionHandler(interaction, client);
    }
};
