import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateContactRequestDto } from './dto/create-contact-request.dto';
import { SupportService } from './support.service';

@ApiTags('Support')
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('contact')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a support contact request' })
  @ApiResponse({ status: 201, description: 'Support request created successfully' })
  async createContactRequest(@Body() dto: CreateContactRequestDto) {
    return this.supportService.createContactRequest(dto);
  }
}
