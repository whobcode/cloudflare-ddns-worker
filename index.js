/**
 * Cloudflare DDNS Worker
 * Handles dynamic DNS updates via HTTP endpoint and cron trigger
 */

export default {
	async fetch(request, env, ctx) {
		return handleRequest(request, env);
	},

	async scheduled(event, env, ctx) {
		// Cron trigger - checks IP from a known endpoint and updates if needed
		await handleCronUpdate(env);
	},
};

/**
 * Handle incoming HTTP requests for DDNS updates
 */
async function handleRequest(request, env) {
	const url = new URL(request.url);

	// Health check endpoint
	if (url.pathname === '/health') {
		return new Response(JSON.stringify({ status: 'ok', service: 'cloudflare-ddns' }), {
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// DDNS update endpoint
	if (url.pathname === '/update') {
		return handleDDNSUpdate(request, env);
	}

	return new Response('Not Found', { status: 404 });
}

/**
 * Handle DDNS update requests from the router
 * Supports query parameters: hostname, myip (optional), username, password
 */
async function handleDDNSUpdate(request, env) {
	try {
		const url = new URL(request.url);
		
		// Extract parameters (common DDNS protocol parameters)
		const hostname = url.searchParams.get('hostname');
		const username = url.searchParams.get('username');
		const password = url.searchParams.get('password');
		let clientIp = url.searchParams.get('myip');

		// Validate authentication
		if (!username || !password) {
			return new Response('badauth', { status: 401 });
		}

		if (username !== env.DDNS_USERNAME || password !== env.DDNS_PASSWORD) {
			return new Response('badauth', { status: 401 });
		}

		// Validate hostname
		if (!hostname) {
			return new Response('notfqdn', { status: 400 });
		}

		// If no IP provided, use the client's IP
		if (!clientIp) {
			clientIp = request.headers.get('CF-Connecting-IP') || 
			           request.headers.get('X-Forwarded-For')?.split(',')[0] ||
			           request.headers.get('X-Real-IP');
		}

		if (!clientIp) {
			return new Response('nohost', { status: 400 });
		}

		// Update DNS record
		const result = await updateDNSRecord(env, hostname, clientIp);

		if (result.success) {
			return new Response(`good ${clientIp}`, { 
				status: 200,
				headers: { 'Content-Type': 'text/plain' }
			});
		} else {
			return new Response(`911 ${result.error}`, { status: 500 });
		}

	} catch (error) {
		console.error('Error handling DDNS update:', error);
		return new Response('dnserr', { status: 500 });
	}
}

/**
 * Handle cron-triggered updates
 * Fetches IP from a check service and updates if changed
 */
async function handleCronUpdate(env) {
	try {
		// Get current public IP
		const ipResponse = await fetch('https://api.ipify.org?format=json');
		const { ip: currentIp } = await ipResponse.json();

		if (!currentIp) {
			console.error('Failed to fetch current IP');
			return;
		}

		const hostname = env.DDNS_HOSTNAME;
		if (!hostname) {
			console.error('DDNS_HOSTNAME not configured');
			return;
		}

		// Get current DNS record
		const currentRecord = await getDNSRecord(env, hostname);
		
		if (currentRecord && currentRecord.content === currentIp) {
			console.log(`IP unchanged: ${currentIp}`);
			return;
		}

		// Update DNS record
		const result = await updateDNSRecord(env, hostname, currentIp);
		
		if (result.success) {
			console.log(`DNS updated: ${hostname} -> ${currentIp}`);
		} else {
			console.error(`DNS update failed: ${result.error}`);
		}

	} catch (error) {
		console.error('Cron update error:', error);
	}
}

/**
 * Get DNS record from Cloudflare
 */
async function getDNSRecord(env, hostname) {
	try {
		const zoneId = env.CLOUDFLARE_ZONE_ID;
		const apiToken = env.CLOUDFLARE_API_TOKEN;

		const response = await fetch(
			`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=${hostname}&type=A`,
			{
				headers: {
					'Authorization': `Bearer ${apiToken}`,
					'Content-Type': 'application/json',
				},
			}
		);

		const data = await response.json();
		
		if (data.success && data.result.length > 0) {
			return data.result[0];
		}

		return null;
	} catch (error) {
		console.error('Error fetching DNS record:', error);
		return null;
	}
}

/**
 * Update DNS record in Cloudflare
 */
async function updateDNSRecord(env, hostname, ip) {
	try {
		const zoneId = env.CLOUDFLARE_ZONE_ID;
		const apiToken = env.CLOUDFLARE_API_TOKEN;

		// First, get the existing record
		const existingRecord = await getDNSRecord(env, hostname);

		let response;

		if (existingRecord) {
			// Update existing record
			response = await fetch(
				`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${existingRecord.id}`,
				{
					method: 'PATCH',
					headers: {
						'Authorization': `Bearer ${apiToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						type: 'A',
						name: hostname,
						content: ip,
						ttl: 120, // 2 minutes for faster updates
						proxied: false, // Set to true if you want Cloudflare proxy
					}),
				}
			);
		} else {
			// Create new record
			response = await fetch(
				`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
				{
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${apiToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						type: 'A',
						name: hostname,
						content: ip,
						ttl: 120,
						proxied: false,
					}),
				}
			);
		}

		const data = await response.json();

		if (data.success) {
			return { success: true, ip };
		} else {
			return { success: false, error: data.errors?.[0]?.message || 'Unknown error' };
		}

	} catch (error) {
		console.error('Error updating DNS record:', error);
		return { success: false, error: error.message };
	}
}
