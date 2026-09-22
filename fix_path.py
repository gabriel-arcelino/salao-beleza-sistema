content = open('tests/ui/fundacao-ui.spec.tsx', 'r', encoding='utf-8').read()
content = content.replace('fs.readFileSync("../../src/pages/DashboardPage.tsx"', 'fs.readFileSync("src/pages/DashboardPage.tsx"')
open('tests/ui/fundacao-ui.spec.tsx', 'w', encoding='utf-8').write(content)
print('done')
