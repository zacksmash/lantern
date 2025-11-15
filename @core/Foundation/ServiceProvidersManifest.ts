import { AuthServiceProvider } from "@core/Auth/AuthServiceProvider";
import { CacheServiceProvider } from "@core/Cache/CacheServiceProvider";
import { DatabaseServiceProvider } from "@core/Database/DatabaseServiceProvider";
import { EncryptionServiceProvider } from "@core/Encryption/EncryptionServiceProvider";
import { MasonServiceProvider } from "@core/Mason/MasonServiceProvider";
import { RoutingServiceProvider } from "@core/Routing/RoutingServiceProvider";
import { SessionServiceProvider } from "@core/Session/SessionServiceProvider";
import AppServiceProviders from "@root/bootstrap/providers";

export const Providers = [
	DatabaseServiceProvider,
	MasonServiceProvider,
	CacheServiceProvider,
	EncryptionServiceProvider,
	SessionServiceProvider,
	AuthServiceProvider,
	RoutingServiceProvider,
	...AppServiceProviders,
];
