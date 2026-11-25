export interface ParsedPackage {
  id: string;
  name: string;
  version: string;
  isDirect: boolean;
  scope: 'prod' | 'dev';
  dependencies: string[];
}

export interface ParsedLockfile {
  projectName: string;
  projectVersion: string;
  packages: ParsedPackage[];
}

export function parsePackageLock(jsonContent: string): ParsedLockfile {
  const data = JSON.parse(jsonContent);
  const projectName = data.name || 'projeto-analisado';
  const projectVersion = data.version || '1.0.0';

  const packagesMap = new Map<string, ParsedPackage>();
  const rawPackages = data.packages || {};
  const rootPkg = rawPackages[''] || {};

  const directProd = new Set(Object.keys(rootPkg.dependencies || {}));
  const directDev = new Set(Object.keys(rootPkg.devDependencies || {}));

  for (const [pkgPath, info] of Object.entries<any>(rawPackages)) {
    if (pkgPath === '') continue;

    // Extrai o nome real do pacote (ex: "node_modules/express" -> "express")
    const parts = pkgPath.split('node_modules/');
    const name = parts[parts.length - 1];
    const version = info.version || '0.0.0';
    const isDirect = directProd.has(name) || directDev.has(name);
    const scope: 'prod' | 'dev' = info.dev ? 'dev' : 'prod';

    const deps = Object.keys({
      ...(info.dependencies || {}),
      ...(info.optionalDependencies || {}),
    });

    const id = `${name}@${version}`;
    if (!packagesMap.has(id)) {
      packagesMap.set(id, {
        id,
        name,
        version,
        isDirect,
        scope,
        dependencies: deps,
      });
    }
  }

  return {
    projectName,
    projectVersion,
    packages: Array.from(packagesMap.values()),
  };
}