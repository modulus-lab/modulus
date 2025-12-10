import {faker} from '@faker-js/faker';
import uniqueKeysConfig from '@/mocks/uniqueKeys.json' with {type: 'json'};

export function generateAllUniqueKeys(currentValues: Record<string, string>): Record<string, string> {
    const newValues: Record<string, string> = {};

    UNIQUE_KEY_GENERATORS.forEach(generator => {
        const currentValue = currentValues[generator.name];
        newValues[generator.name] = generator.generate(currentValue);
    });

    return newValues;
}

interface GeneratorConfig {
    name: string;
    type: string;
    config?: {
        start?: string;
        prefix?: string;
        args?: any[];
        [key: string]: any;
    };
}

interface Generator {
    name: string;
    generate: (currentValue?: string) => string;
}

function getFakerMethod(path: string): (...args: any[]) => any {
    const parts = path.split('.');
    let current: any = faker;

    for (const part of parts) {
        if (current[part] === undefined) {
            throw new Error(`Faker method not found: ${path}`);
        }
        current = current[part];
    }

    if (typeof current !== 'function') {
        throw new Error(`Faker path is not a function: ${path}`);
    }

    return current.bind(faker);
}

function createGenerator(config: GeneratorConfig): Generator {
    const genConfig = config.config || {};

    if (config.type === 'incrementing') {
        let {prefix = '', suffix = '', start = '1000'} = genConfig;
        return {
            name: config.name,
            generate: (currentValue?: string) => {
                let currentValueStr = currentValue || '';

                // Remove prefix if present
                if (prefix && currentValueStr.startsWith(prefix)) {
                    currentValueStr = currentValueStr.slice(prefix.length);
                }

                // Remove suffix if present
                if (suffix && currentValueStr.endsWith(suffix)) {
                    currentValueStr = currentValueStr.slice(0, -suffix.length);
                }

                // If nothing left, use start
                if (!currentValueStr) {
                    return prefix + start + suffix;
                }

                // Parse numeric middle
                const currentNum = parseInt(currentValueStr, 10);

                // If invalid number, reset to start
                if (isNaN(currentNum)) {
                    return prefix + start + suffix;
                }

                // Increment and rebuild
                return prefix + (currentNum + 1).toString() + suffix;
            }
        };
    }

    return {
        name: config.name,
        generate: () => {
            try {
                const fakerMethod = getFakerMethod(config.type);
                const args = genConfig.args || [];
                const result = fakerMethod(...args);

                if (genConfig.prefix) {
                    return genConfig.prefix + result;
                }

                return String(result);
            } catch (error) {
                console.error(`Error generating faker value for method "${config.type}":`, error);
                throw error;
            }
        }
    };
}

function createGenerators(configs: GeneratorConfig[]): Generator[] {
    return configs.map(config => createGenerator(config));
}

const UNIQUE_KEY_GENERATORS = createGenerators(uniqueKeysConfig as GeneratorConfig[]);
