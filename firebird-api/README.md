# Firebird REST API

Este servicio web ASP.NET Core proporciona una API REST para interactuar con bases de datos Firebird utilizando el cliente oficial `FirebirdSql.Data.FirebirdClient`.

## Características

- ✅ Verificación de estado de servidores Firebird
- ✅ Obtención de esquemas de tablas
- ✅ Sincronización de datos entre servidores
- ✅ CORS habilitado para llamadas desde navegadores
- ✅ Logging integrado
- ✅ Swagger UI para documentación

## Endpoints

### `POST /api/firebird/status`
Verifica el estado de conexión de dos servidores Firebird.

**Request Body:**
```json
{
  "serverA": {
    "host": "192.168.1.100",
    "port": 3050,
    "database": "/path/to/database.fdb",
    "user": "sysdba",
    "password": "password"
  },
  "serverB": {
    "host": "192.168.1.101",
    "port": 3050,
    "database": "/path/to/database.fdb",
    "user": "sysdba",
    "password": "password"
  }
}
```

### `POST /api/firebird/tables`
Obtiene la lista de tablas y sus esquemas de un servidor Firebird.

**Request Body:**
```json
{
  "config": {
    "host": "192.168.1.100",
    "port": 3050,
    "database": "/path/to/database.fdb",
    "user": "sysdba",
    "password": "password"
  }
}
```

### `POST /api/firebird/sync`
Sincroniza datos entre dos servidores Firebird.

**Request Body:**
```json
{
  "sourceConfig": {
    "host": "192.168.1.100",
    "port": 3050,
    "database": "/path/to/source.fdb",
    "user": "sysdba",
    "password": "password"
  },
  "targetConfig": {
    "host": "192.168.1.101",
    "port": 3050,
    "database": "/path/to/target.fdb",
    "user": "sysdba",
    "password": "password"
  },
  "tableNames": ["CUSTOMERS", "ORDERS"] // Opcional, si no se especifica sincroniza todas las tablas
}
```

### `GET /api/firebird/health`
Endpoint de salud para verificar que el servicio está funcionando.

## Instalación y Ejecución

### Requisitos
- .NET 8.0 SDK
- Acceso a bases de datos Firebird

### Ejecución Local
```bash
cd firebird-api
dotnet restore
dotnet run
```

El servicio estará disponible en `https://localhost:5001` (HTTPS) y `http://localhost:5000` (HTTP).

### Ejecución con Docker
```bash
cd firebird-api
docker build -t firebird-api .
docker run -p 8080:80 firebird-api
```

### Variables de Entorno (Opcional)
Puedes configurar el logging y otros aspectos mediante variables de entorno:

```bash
export ASPNETCORE_ENVIRONMENT=Production
export ASPNETCORE_URLS="http://+:8080"
```

## Deployment

### Docker
La aplicación incluye un `Dockerfile` optimizado para producción.

### IIS / Windows Server
1. Publica la aplicación: `dotnet publish -c Release -o ./publish`
2. Copia los archivos a tu servidor IIS
3. Configura la aplicación pool para usar .NET 8

### Linux / Systemd
```bash
# Crear usuario para el servicio
sudo useradd -r -s /bin/false firebirdapi

# Crear directorio y copiar archivos
sudo mkdir /opt/firebirdapi
sudo cp -r ./publish/* /opt/firebirdapi/
sudo chown -R firebirdapi:firebirdapi /opt/firebirdapi

# Crear servicio systemd
sudo tee /etc/systemd/system/firebirdapi.service > /dev/null <<EOF
[Unit]
Description=Firebird API Service
After=network.target

[Service]
Type=notify
User=firebirdapi
ExecStart=/usr/bin/dotnet /opt/firebirdapi/FirebirdApi.dll
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Habilitar e iniciar el servicio
sudo systemctl daemon-reload
sudo systemctl enable firebirdapi
sudo systemctl start firebirdapi
```

## Seguridad

⚠️ **Importante**: Este servicio maneja credenciales de bases de datos. En producción:

1. Usa HTTPS siempre
2. Implementa autenticación/autorización adecuada
3. Considera usar un servicio de gestión de secretos
4. Restringe el acceso por IP si es posible
5. Implementa rate limiting

## Logs

Los logs se escriben en la consola por defecto. En producción, considera configurar un proveedor de logging como Serilog para persistir logs en archivos o sistemas externos.

## Troubleshooting

### Error: "Unable to connect to database"
- Verifica que el servidor Firebird esté ejecutándose
- Confirma que el puerto (generalmente 3050) esté abierto
- Verifica las credenciales de acceso
- Asegúrate de que el archivo de base de datos exista y tenga permisos correctos

### Error: "Assembly 'FirebirdSql.Data.FirebirdClient' not found"
- Ejecuta `dotnet restore` para restaurar las dependencias NuGet

### Errores de CORS
- Verifica que el origen de tu cliente esté permitido
- En desarrollo, la política "AllowAll" debería funcionar
- En producción, configura orígenes específicos por seguridad