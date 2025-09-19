using Microsoft.AspNetCore.Mvc;
using FirebirdApi.Models;
using FirebirdApi.Services;

namespace FirebirdApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FirebirdController : ControllerBase
    {
        private readonly FirebirdService _firebirdService;
        private readonly ILogger<FirebirdController> _logger;

        public FirebirdController(FirebirdService firebirdService, ILogger<FirebirdController> logger)
        {
            _firebirdService = firebirdService;
            _logger = logger;
        }

        [HttpPost("status")]
        public async Task<ActionResult<ServerStatusResponse>> CheckServerStatus([FromBody] ServerStatusRequest request)
        {
            try
            {
                _logger.LogInformation("Checking status for servers: {ServerA} and {ServerB}", 
                    request.ServerA.Host, request.ServerB.Host);

                var serverATask = _firebirdService.CheckServerStatusAsync(request.ServerA);
                var serverBTask = _firebirdService.CheckServerStatusAsync(request.ServerB);

                await Task.WhenAll(serverATask, serverBTask);

                var response = new ServerStatusResponse
                {
                    Success = true,
                    ServerA = await serverATask,
                    ServerB = await serverBTask
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking server status");
                return StatusCode(500, new ServerStatusResponse
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpPost("tables")]
        public async Task<ActionResult<TablesResponse>> GetTables([FromBody] TablesRequest request)
        {
            try
            {
                _logger.LogInformation("Getting tables from server: {Host}:{Port}", 
                    request.Config.Host, request.Config.Port);

                var response = await _firebirdService.GetTablesAsync(request.Config);
                
                if (response.Success)
                {
                    return Ok(response);
                }
                else
                {
                    return BadRequest(response);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting tables");
                return StatusCode(500, new TablesResponse
                {
                    Success = false,
                    Error = ex.Message
                });
            }
        }

        [HttpPost("sync")]
        public async Task<ActionResult<SyncResponse>> SyncData([FromBody] SyncRequest request)
        {
            try
            {
                _logger.LogInformation("Starting sync from {Source} to {Target}", 
                    request.SourceConfig.Host, request.TargetConfig.Host);

                var response = await _firebirdService.SyncDataAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during sync");
                return StatusCode(500, new SyncResponse
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpGet("health")]
        public IActionResult Health()
        {
            return Ok(new { Status = "Healthy", Timestamp = DateTime.UtcNow });
        }
    }
}