import { faker } from '@faker-js/faker'

/**
 * Test data generators using faker
 * Used for creating realistic test gists with random data
 */

export interface TestFile {
  filename: string
  content: string
  language?: string
}

export interface TestGist {
  description: string
  files: Record<string, { content: string }>
  public: boolean
}

/**
 * Generate a random programming language file extension and content
 */
export function generateCodeFile(): TestFile {
  const languages = [
    { ext: 'js', lang: 'JavaScript', generator: () => generateJavaScript() },
    { ext: 'ts', lang: 'TypeScript', generator: () => generateTypeScript() },
    { ext: 'py', lang: 'Python', generator: () => generatePython() },
    { ext: 'md', lang: 'Markdown', generator: () => generateMarkdown() },
    { ext: 'json', lang: 'JSON', generator: () => generateJSON() },
    { ext: 'sh', lang: 'Shell', generator: () => generateShell() },
  ]

  const lang = faker.helpers.arrayElement(languages)
  const filename = `${faker.word.noun().toLowerCase()}.${lang.ext}`

  return {
    filename,
    content: lang.generator(),
    language: lang.lang,
  }
}

/**
 * Generate JavaScript code snippet
 */
export function generateJavaScript(): string {
  const funcName = faker.word.verb().toLowerCase()
  const varName = faker.word.noun().toLowerCase()
  const message = faker.lorem.sentence()

  return `// ${faker.lorem.sentence()}
function ${funcName}(${varName}) {
  console.log("${message}");
  return ${varName} * ${faker.number.int({ min: 1, max: 100 })};
}

const result = ${funcName}(${faker.number.int({ min: 1, max: 50 })});
console.log(result);
`
}

/**
 * Generate TypeScript code snippet
 */
export function generateTypeScript(): string {
  const interfaceName = faker.word.noun().charAt(0).toUpperCase() + faker.word.noun().slice(1)
  const funcName = faker.word.verb().toLowerCase()

  return `// ${faker.lorem.sentence()}
interface ${interfaceName} {
  id: number;
  name: string;
  active: boolean;
}

function ${funcName}(item: ${interfaceName}): string {
  return \`\${item.name} is \${item.active ? 'active' : 'inactive'}\`;
}

const data: ${interfaceName} = {
  id: ${faker.number.int({ min: 1, max: 1000 })},
  name: "${faker.person.firstName()}",
  active: ${faker.datatype.boolean()}
};

console.log(${funcName}(data));
`
}

/**
 * Generate Python code snippet
 */
export function generatePython(): string {
  const funcName = faker.word.verb().toLowerCase()
  const className = faker.word.noun().charAt(0).toUpperCase() + faker.word.noun().slice(1)

  return `# ${faker.lorem.sentence()}

class ${className}:
    def __init__(self, name: str):
        self.name = name
        self.value = ${faker.number.int({ min: 1, max: 100 })}

    def ${funcName}(self) -> str:
        return f"{self.name}: {self.value}"

if __name__ == "__main__":
    obj = ${className}("${faker.person.firstName()}")
    print(obj.${funcName}())
`
}

/**
 * Generate Markdown content
 */
export function generateMarkdown(): string {
  const title = faker.lorem.words(3)
  const paragraphs = faker.lorem.paragraphs(2)

  return `# ${title}

${paragraphs}

## Features

${faker.helpers.multiple(() => `- ${faker.lorem.sentence()}`, { count: 4 }).join('\n')}

## Installation

\`\`\`bash
npm install ${faker.word.noun().toLowerCase()}-${faker.word.adjective().toLowerCase()}
\`\`\`

## Usage

\`\`\`javascript
const lib = require('${faker.word.noun().toLowerCase()}');
lib.init();
\`\`\`
`
}

/**
 * Generate JSON content
 */
export function generateJSON(): string {
  const data = {
    name: faker.person.fullName(),
    email: faker.internet.email(),
    company: faker.company.name(),
    address: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      country: faker.location.country(),
    },
    settings: {
      theme: faker.helpers.arrayElement(['dark', 'light', 'auto']),
      notifications: faker.datatype.boolean(),
      language: faker.helpers.arrayElement(['en', 'es', 'fr', 'de']),
    },
  }

  return JSON.stringify(data, null, 2)
}

/**
 * Generate Shell script
 */
export function generateShell(): string {
  const scriptName = faker.word.verb().toLowerCase()

  return `#!/bin/bash
# ${faker.lorem.sentence()}

set -e

${scriptName.toUpperCase()}_VERSION="${faker.system.semver()}"
OUTPUT_DIR="${faker.system.directoryPath()}"

echo "Starting ${scriptName}..."
echo "Version: $${scriptName.toUpperCase()}_VERSION"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Run main process
for i in {1..${faker.number.int({ min: 3, max: 10 })}}; do
    echo "Processing item $i..."
    sleep 0.1
done

echo "Done!"
`
}

/**
 * Generate a complete test gist with random content
 */
export function generateTestGist(options?: {
  fileCount?: number
  isPublic?: boolean
  tags?: string[]
}): TestGist {
  const fileCount = options?.fileCount ?? faker.number.int({ min: 1, max: 3 })
  const isPublic = options?.isPublic ?? faker.datatype.boolean()
  const tags = options?.tags ?? []

  // Generate description with optional tags
  let description = faker.lorem.sentence()
  if (tags.length > 0) {
    description += ' ' + tags.map((t) => `#${t}`).join(' ')
  } else if (faker.datatype.boolean()) {
    // Randomly add some tags
    const randomTags = faker.helpers.multiple(() => faker.word.noun().toLowerCase(), {
      count: faker.number.int({ min: 1, max: 3 }),
    })
    description += ' ' + randomTags.map((t) => `#${t}`).join(' ')
  }

  // Generate files
  const files: Record<string, { content: string }> = {}
  for (let i = 0; i < fileCount; i++) {
    const file = generateCodeFile()
    files[file.filename] = { content: file.content }
  }

  return {
    description,
    files,
    public: isPublic,
  }
}

/**
 * Generate multiple test gists
 */
export function generateTestGists(count: number): TestGist[] {
  return faker.helpers.multiple(() => generateTestGist(), { count })
}

/**
 * Generate a unique test tag for identifying test-created gists
 */
export function generateTestTag(): string {
  return `e2e-test-${faker.string.alphanumeric(8)}`
}

/**
 * Generate test gist with a specific test tag for cleanup
 */
export function generateTaggedTestGist(testTag: string): TestGist {
  return generateTestGist({ tags: [testTag, 'automated-test'] })
}
