class AIProvider {
  async research(_request) {
    throw new Error('AIProvider.research must be implemented.');
  }

  checkConfiguration() {
    throw new Error('AIProvider.checkConfiguration must be implemented.');
  }
}

module.exports = {
  AIProvider,
};
