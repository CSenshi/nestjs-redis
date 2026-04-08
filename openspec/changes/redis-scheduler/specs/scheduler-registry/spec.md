## ADDED Requirements

### Requirement: SchedulerRegistry is injectable and API-compatible with @nestjs/schedule
The system SHALL provide a `SchedulerRegistry` class injectable via NestJS DI that exposes the same public method signatures as `@nestjs/schedule`'s `SchedulerRegistry`.

#### Scenario: Injecting the registry
- **WHEN** a service declares `constructor(private registry: SchedulerRegistry)`
- **THEN** NestJS resolves the `@nestjs-redis/scheduler` registry without error

---

### Requirement: getCronJob returns a handle for a named cron job
`getCronJob(name: string)` SHALL return a job handle for the named cron job. It SHALL throw if no job with that name exists.

#### Scenario: Getting an existing cron job
- **WHEN** `registry.getCronJob('myJob')` is called and the job was registered at bootstrap
- **THEN** a non-null handle is returned

#### Scenario: Getting a non-existent cron job
- **WHEN** `registry.getCronJob('nonExistent')` is called
- **THEN** an error is thrown with a message identifying the missing job name

---

### Requirement: getCronJobs returns all registered cron jobs
`getCronJobs()` SHALL return a `Map<string, CronJobHandle>` of all currently registered cron jobs (including disabled ones).

#### Scenario: Listing all cron jobs
- **WHEN** two `@Cron` methods are declared and the module bootstraps
- **THEN** `registry.getCronJobs().size` equals 2

---

### Requirement: addCronJob registers a new cron job at runtime
`addCronJob(name: string, job: CronJobHandle)` SHALL add a new named cron job to the registry. It SHALL throw `DUPLICATE_SCHEDULER` if a job with that name already exists.

#### Scenario: Adding a duplicate cron job
- **WHEN** `registry.addCronJob('myJob', handle)` is called and 'myJob' already exists
- **THEN** an error is thrown with a duplicate scheduler message

---

### Requirement: deleteCronJob removes and stops a cron job
`deleteCronJob(name: string)` SHALL stop the job (remove from Redis ZSET if active) and remove it from the registry. It SHALL throw if the job does not exist.

#### Scenario: Deleting an active cron job
- **WHEN** `registry.deleteCronJob('myJob')` is called for an active job
- **THEN** the ZSET entry is removed and the job no longer fires

---

### Requirement: doesExist checks for job presence without throwing
`doesExist(type: 'cron' | 'interval' | 'timeout', name: string)` SHALL return `true` if a scheduler of the given type and name exists, `false` otherwise.

#### Scenario: Checking an existing job
- **WHEN** `registry.doesExist('cron', 'myJob')` is called for a registered job
- **THEN** `true` is returned

#### Scenario: Checking a non-existent job
- **WHEN** `registry.doesExist('cron', 'ghost')` is called
- **THEN** `false` is returned

---

### Requirement: Interval and Timeout registry methods match @nestjs/schedule
`getIntervals()`, `getTimeouts()`, `addInterval()`, `addTimeout()`, `deleteInterval()`, `deleteTimeout()`, `getInterval()`, `getTimeout()` SHALL have identical signatures and behaviour to `@nestjs/schedule`'s `SchedulerRegistry`.

#### Scenario: Getting interval IDs
- **WHEN** `registry.getIntervals()` is called after two `@Interval` methods bootstrap
- **THEN** an array of two interval name strings is returned
