const fs = require('fs');
const yaml = require('js-yaml');
const fetch = require('node-fetch');
const Ajv = require("ajv").default;

const graderUrls = {
    'javac-tool': 'http://192.168.99.1:3003/config_schema',
    // 'rng-tool': 'http://192.168.99.1:3001/config_schema',
    // 'config-tool': 'http://192.168.99.1:3002/config_schema',
    'io-grader': 'http://192.168.99.1:3004/config_schema',
    'junit-grader': 'http://192.168.99.1:3006/config_schema',
    'cpp-iograder': 'http://192.168.99.1:3008/config_schema',
    'cpp-compilation': 'http://192.168.99.1:3007/config_schema',
    'cppunit-grader': 'http://192.168.99.1:3015/config_schema'
};

const requiredAssignmentProperties = [ 'name', 'weight', 'condition', 'configuration' ];
const graderConfigSchema = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            name: { type: 'string', enum: Object.keys(graderUrls) },
            weight: { type: 'integer' },
            condition: { type: 'integer' },
            context: { type: 'string' },
            'depends-on': {
                type: 'array',
                items: { type: 'string' }
            },
            configuration: {
                oneOf: [
                    { type: 'object' },
                    { type: 'null' }
                ]
            }
        },
        required: requiredAssignmentProperties, // I don't think this is strictly necessary
        additionalProperties: false
    }
};

// Converts a parameter in a grader config schema to an equivalent JSON schema object
const schemaPropertyToJsonSchema = (property) => {
    if (property.type == 'git') {
        return {
            type: 'object',
            properties: {
                repository: { type: 'string', },
                branch: { type: 'string', },
                sha: { type: 'string', }
            },
            required: [ 'repository', 'branch', 'sha' ],
            additionalProperties: false
        }
    } else if (property.type == 'int') {
        return {
            type: 'integer',
            minimum: property.min,
            maximum: property.max,
            multipleOf: property.step,
            default: property.initial
        }
    } else if (property.type == 'string') {
        return {
            type: 'string',
            default: property.initial
        }
    }
    
    throw new Error(`Invalid grader config parameter type: ${type}`);
};

// Retrieve grader config schema from a GET config_schema endpoint
const retrieveConfigSchema = async (endpoint) => {
    const response = await fetch(endpoint)
        .catch(error => { throw new Error(`Invalid request to server ${endpoint}: ${error.message}`) });

    if (!response.ok) {
        const errorText = response.statusText;
        throw new Error(`Invalid response from server ${endpoint}: ${errorText}`);
    }

    const responseJson = await response.json();
    return responseJson;
};

// Return the 'configuration' property for a grader in grader-config
const configSchemaToJsonSchema = (configSchema) => {
    if (configSchema.parameters == 0) {
        // Grader is non-configurable
        return { type: 'null' }
        // return {
        //     type: 'object',
        //     properties: {},
        //     additionalProperties: false
        // }
    } else {
        // Grader is configurable
        
        const propertiesParam = {};
        const properties = [];
        for (const parameter in configSchema.parameters) {
            // Generate the 'properties' property for a JSON schema object for
            // each schema property received from a GET grader config schema
            // endpoint
            propertiesParam[parameter] = schemaPropertyToJsonSchema(configSchema.parameters[parameter]);

            // Store each property in an array as a string. This will be used
            // for the 'required' property for a JSON schema object.
            properties.push(parameter);
        }

        return {
            type: 'object',
            properties: propertiesParam,
            required: properties,
            additionalProperties: false
        }
    }
};

// Generates a JSON schema conditional statement for a configuration based on the name of the grader used
const configJsonSchemaToConditional = (graderName, configurationSchema) => {
    // const configSchemaIsConfigurable = Object.keys(configurationSchema).length != 0;
    // if (configSchemaIsConfigurable) {
        return {
            if: { properties: { name: { const: graderName } }, },
            then: {
                properties: { configuration: configurationSchema },
                // required: ["configuration", ...requiredAssignmentProperties], // Assuming this replaces the required property that is already specified
                required: requiredAssignmentProperties,
                // additionalProperties: false
            }
        };
    // } else {
    //     return {
    //         if: { properties: { name: { const: graderName } } },
    //         then: {
    //             properties: { configuration: { const: 0 } },
    //             required: requiredAssignmentProperties,
    //             // required: ["configuration", ...requiredAssignmentProperties], // Assuming this replaces the required property that is already specified
    //             // additionalProperties: false
    //         }
    //     };
    // }
};

// Generates an 'allOf' array of JSON schema conditional statements to change
// the 'configuration' property based on name of the grader
const generateConfigJsonSchemaConditionals = async (graderUrls) => {
    const configJsonSchemas = {};
    for (const graderName in graderUrls) {
        const configSchema = await retrieveConfigSchema(graderUrls[graderName]);
        const jsonSchema = configSchemaToJsonSchema(configSchema);
        configJsonSchemas[graderName] = jsonSchema;
    }

    const configJsonSchemaConditionals = [];
    for (const graderName in configJsonSchemas) {
        const jsonSchemaConditional = configJsonSchemaToConditional(graderName, configJsonSchemas[graderName]);
        configJsonSchemaConditionals.push(jsonSchemaConditional);
    }

    console.dir(configJsonSchemaConditionals, { depth: null })

    return configJsonSchemaConditionals;
};

const injectConfigJsonSchemaConditionals = (configJsonSchemaConditionals) => {
    graderConfigSchema.items.allOf = configJsonSchemaConditionals;
};

(async () => {
    try {
    //   const configSchemaEndpoint = "http://192.168.99.1:3006/config_schema";
    //   const configSchema = await retrieveConfigSchema(configSchemaEndpoint);
    //   console.log(configSchema);
    //   console.log();

    //   const jsonSchema = configSchemaToJsonSchema(configSchema);
    //   console.dir(jsonSchema, { depth: null });

      const configJsonSchemaConditionals = await generateConfigJsonSchemaConditionals(graderUrls);
      injectConfigJsonSchemaConditionals(configJsonSchemaConditionals);
      console.dir(graderConfigSchema, { depth: null })
      
    //   const conditional = configurableGraderConfigJsonSchemaToConditional();
    //   console.dir(conditional, { depth: null });

      // const graderJsonSchema = configSchemaToJsonSchema(graderSchema);
      // console.dir(graderJsonSchema, { depth: null });

      // const conditional = configurableGraderConfigJsonSchemaToConditional("junit-grader", graderJsonSchema);
      // console.dir(conditional, { depth: null });

    //   const allOf = await generateGraderConfigConditionals(graderUrls);
      // console.dir(allOf, { depth: null });

    //   const finalSchema = injectAllOf(allOf);
    //   console.dir(finalSchema, { depth: 5 });
    //   console.dir(graderConfigSchema, { depth: 16 });

      const yamlFile = 'grader-config.yml';
      const convertedFile = yaml.load(fs.readFileSync(yamlFile, 'utf8'));
      console.log('YAML converted to JSON:');
      console.log(convertedFile);

      const ajv = new Ajv(); // options can be passed
      const validate = ajv.compile(graderConfigSchema);
      const valid = validate(convertedFile);
      if (!valid) {
          console.log(validate.errors);
      } else {
          console.log('Wow, that is incredibly valid')
      }

    } catch (error) {
        console.log(error);
    }
})();
