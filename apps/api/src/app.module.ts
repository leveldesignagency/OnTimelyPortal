import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { UsersModule } from './users/users.module';
import { GuestsModule } from './guests/guests.module';
import { LogisticsModule } from './logistics/logistics.module';
import { InventoryModule } from './inventory/inventory.module';
import { MessagesModule } from './messages/messages.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    EventsModule,
    UsersModule,
    GuestsModule,
    LogisticsModule,
    InventoryModule,
    MessagesModule,
  ],
  controllers: [AppController],
})
export class AppModule {} 