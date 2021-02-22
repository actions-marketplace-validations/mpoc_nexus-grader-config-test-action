const fs = require('fs');
const yaml = require('js-yaml');
const fetch = require('node-fetch');
const Ajv = require("ajv").default;

const graderConfigSchema = {
    'type': 'array',
    'items': { // This should be anyof and then specify each configuration for each grader
        'type': 'object',
        'properties': {
            'name': { 'type': 'string' },
            'weight': { 'type': 'integer' },
            'condition': { 'type': 'integer' },
            'context': { 'type': 'string' },
            'depends-on': {
                'type': 'array',
                'items': { 'type': 'string' }
            },
            'configuration': { // This should allow multiple types
                // 'type': 'object',
                // 'properties': {
                //     'test_files': {
                //         'type': 'object',
                //         'properties': {
                //             'repository': {
                //                 'type': 'string'
                //             },
                //             'branch': {
                //                 'type': 'string'
                //             },
                //             'sha': {
                //                 'type': 'string'
                //             }
                //         },
                //         'required': [
                //             'repository',
                //             'branch',
                //             'sha'
                //         ]
                //     },
                //     'timeout': {
                //         'type': 'string'
                //     }
                // },
                // 'required': [
                //     'test_files',
                //     'timeout'
                // ]
            }
        },
        // 'required': [
        //     'name',
        //     'weight',
        //     'condition',
        //     'context',
        //     'depends-on',
        //     'configuration'
        // ]
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
}

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

const retrieveGraderConfigSchema = async (endpoint) => {
    const response = await fetch(endpoint)
        .catch(error => { throw new Error(`Invalid request to server: ${error.message}`) });

    if (!response.ok) {
        const errorText = response.statusText;
        throw new Error(`Invalid response from server: ${errorText}`);
    }

    const responseJson = await response.json();
    return responseJson;
}

(async () => {
    try {
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

        const graderSchemaEndpoint = "http://192.168.99.1:3003/config_schema";
        const graderSchema = await retrieveGraderConfigSchema(graderSchemaEndpoint);

        if (configSchema.parameters == 0) {
            // Grader is non-configurable
        } else {
            // Grader is configurable
        }
        console.log(graderSchema);

        const graderJsonSchema = convertConfigSchemaToJsonSchema(graderSchema.parameters);
        console.dir(graderJsonSchema, { depth: null });
    } catch (error) {
        console.log(error);
    }
})();
