/**
 * Mock validator module to help with tests
 */

module.exports = {
  mockValidateRequestBody: function(requiredFields) {
    // Return a function that accepts req, res, next
    return function(req, res, next) {
      const missing = [];
      if (!req.body) {
        next(new Error('Empty body'));
        return;
      }
      
      requiredFields.forEach(field => {
        if (req.body[field] === undefined) {
          missing.push(field);
        }
      });
      
      if (missing.length > 0) {
        const error = new Error(`Missing fields: ${missing.join(', ')}`);
        error.status = 400;
        error.fields = missing;
        next(error);
        return;
      }
      
      next();
    };
  },
  
  mockValidateQueryParams: function(requiredParams) {
    return function(req, res, next) {
      const missing = [];
      
      requiredParams.forEach(param => {
        if (req.query[param] === undefined) {
          missing.push(param);
        }
      });
      
      if (missing.length > 0) {
        const error = new Error(`Missing params: ${missing.join(', ')}`);
        error.status = 400;
        error.params = missing;
        next(error);
        return;
      }
      
      next();
    };
  }
};
