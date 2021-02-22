const fs = require('fs');
const yaml = require('js-yaml');
const fetch = require('node-fetch');
const Ajv = require("ajv").default;

const graderConfigSchema = {
    'type': 'array',
    'items': {
        'type': 'object',
        'properties': {
            'name': {
                'type': 'string',
                'required': true
            },
            'weight': {
                'type': 'integer',
                'required': true
            },
            'condition': {
                'type': 'integer',
                'required': true
            },
            'context': { 'type': 'string' },
            'depends-on': {
                'type': 'array',
                'items': { 'type': 'string' }
            }
        },
        "allOf": [
            {
                "if": {
                    "properties": { "name": { "const": "junit-grader" } }
                },
                "then": {
                    "properties": { "configuration": { "pattern": "[0-9]{5}(-[0-9]{4})?" } }
                }
            },
        ]
    }
};

// Converts a parameter in a grader config schema to an equivalent JSON schema object
const schemaPropertyToJsonSchema = (property) => {
    if (property.type == 'git') {
        return {
            type: 'object',
            properties: {
                repository: {
                    type: 'string',
                    required: true
                },
                branch: {
                    type: 'string',
                    required: true
                },
                sha: {
                    type: 'string',
                    required: true
                }
            }
        }
    } else if (property.type == 'int') {
        return {
            type: 'int',
            minimum: property.min,
            maximum: property.max,
            multipleOf: property.step,
            default: property.initial,
            required: true
        }
    } else if (property.type == 'string') {
        return {
            type: 'string',
            default: property.initial,
            required: true,
        }
    }
    
    throw new Error(`Invalid grader config parameter type: ${type}`);
};

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

// Iterate through the properties of the grader config schema. For each
// property, convert it to a JSON schema definition. Then reduce all of this
// into a single object, which would represent the 'properties' object of some
// JSON schema.
const convertConfigurableConfigSchemaToJsonSchema = (configSchema) => {
    const propertiesJsonSchema = Object.entries(configSchema).reduce((acc, [propertyName, schema]) => ({
        [propertyName]: schemaPropertyToJsonSchema(schema), // Dynamic property name definition
        ...acc
    }), {});

    return propertiesJsonSchema;
};

const configSchemaToJsonSchema = (configSchema) => {
    if (configSchema.parameters == 0) {
        // Grader is non-configurable
        return {}
    } else {
        // Grader is configurable
        return {
            type: 'object',
            properties: convertConfigurableConfigSchemaToJsonSchema(configSchema.parameters),
            required: true
        }
    }
};

// Generates a JSON schema conditional statement for a configuration based on the name of the grader used
const generateGraderConfigConditional = (graderName, configurationSchema) => {
    return {
        "if": {
            "properties": { "name": { "const": graderName } }
        },
        "then": {
            "properties": { "configuration": configurationSchema }
        }
    };
}

// Generates an 'allOf' array of JSON schema conditional statements to change
// the 'configuration' property based on name of the grader
const generateGraderConfigConditionals = async (graderUrls) => {
    let graderConditionals = [];
    for ([graderName, graderUrl] of Object.entries(graderUrls)) {
        graderConditionals = [
            generateGraderConfigConditional(
                graderName,
                configSchemaToJsonSchema(
                    await retrieveGraderConfigSchema(graderUrl)
                )
            ),
            ...graderConditionals,
        ];
    }
    return graderConditionals;
};

const injectAllOf = (allOfArr) => {
    graderConfigSchema.items.allOf = allOfArr;
    return graderConfigSchema;
}

const retrieveGraderConfigSchema = async (endpoint) => {
    const response = await fetch(endpoint)
        .catch(error => { throw new Error(`Invalid request to server: ${error.message}`) });

    if (!response.ok) {
        const errorText = response.statusText;
        throw new Error(`Invalid response from server ${endpoint}: ${errorText}`);
    }

    const responseJson = await response.json();
    return responseJson;
}

(async () => {
    try {
      // const graderSchemaEndpoint = "http://192.168.99.1:3006/config_schema";
      // const graderSchema = await retrieveGraderConfigSchema(graderSchemaEndpoint);
      // console.log(graderSchema);

      // const graderJsonSchema = configSchemaToJsonSchema(graderSchema);
      // console.dir(graderJsonSchema, { depth: null });

      // const conditional = generateGraderConfigConditional("junit-grader", graderJsonSchema);
      // console.dir(conditional, { depth: null });

      const allOf = await generateGraderConfigConditionals(graderUrls);
      // console.dir(allOf, { depth: null });

      const finalSchema = injectAllOf(allOf);
      console.dir(finalSchema, { depth: null });
      
      // const yamlFile = 'grader-config.yml';
      // const convertedFile = yaml.load(fs.readFileSync(yamlFile, 'utf8'));
      // console.log('YAML converted to JSON:');
      // console.log(convertedFile);

      // const ajv = new Ajv(); // options can be passed
      // const validate = ajv.compile(graderConfigSchema);
      // const valid = validate(convertedFile);
      // if (!valid) {
      //     console.log(validate.errors);
      // } else {
      //     console.log('Wow, that is incredibly valid')
      // }
    } catch (error) {
        console.log(error);
    }
})();
