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
    return {
      name: config.name,
      generate: (currentValue?: string) => {
          if (genConfig.prefix){
              currentValue = currentValue?.slice(genConfig.prefix.length);
          }
        if (!currentValue) return (genConfig.prefix || '') + (genConfig.start || '1000');
        const currentNum = parseInt(currentValue, 10);
        if (isNaN(currentNum)) return (genConfig.prefix || '') + (genConfig.start || '1000');
        return (genConfig.prefix || '')+(currentNum + 1).toString();
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
