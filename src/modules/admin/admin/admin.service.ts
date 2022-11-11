import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Hash } from '../../../utils/Hash';
import { RegisterPayload } from '../auth';
import { getManager, Like, Repository } from 'typeorm';
import { ResponseCode, ResponseMessage } from '../../../utils/enum';
import { Admin } from './admin.entity';
import { AdminListDTO, AdminLogDTO } from './commons/admin.dtos';
import { isUUID } from 'class-validator';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { AdminLoginHistory } from './admin-login-history.entity';
import moment from 'moment';
import { AccountStatus } from './commons/admin.enum';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(AdminLoginHistory)
    private readonly logsRepository: Repository<AdminLoginHistory>,
  ) { }

  async get(uuid: string) {
    return this.adminRepository.findOne({ uuid });
  }

  async getByEmail(email: string) {
    return await this.adminRepository.findOne({ email });
  }

  async isAdminExist() {
    return await this.adminRepository.count();
  }
  /**
   * hashes the password first and saves it
   *
   * @param admin
   * @param newPassword
   * @returns
   */
  async setPassword(admin: Admin, newPassword: string) {
    admin.password = await Hash.make(newPassword);
    admin.status = AccountStatus.ACTIVE;
    admin.emailConfirmed = true;
    return await this.adminRepository.save(admin);
  }

  /**
   * saves the key into database
   *
   * @param admin
   * @param key
   * @returns
   */
  async setToTpURI(admin: Admin, key: string) {
    admin.twoFaKey = key;
    admin.twoFa = false;
    return await this.adminRepository.save(admin);
  }

  /**
   * Create a genesis user
   *
   * @param payload
   * @returns
   */
  async createAdmin(payload: RegisterPayload): Promise<Admin> {
    const admin = await this.getByEmail(payload.email);
    if (admin) {
      throw new HttpException(
        ResponseMessage.USER_ALREADY_EXISTS,
        ResponseCode.BAD_REQUEST,
      );
    }
    const newAdmin = new Admin().fromDto(payload);

    return await this.adminRepository.save(newAdmin);
  }

  /**
   * Forget password confirmation
   *
   * @param admin
   * @param password
   * @returns
   */
  public async confirmForgotPassword(admin: Admin, password: string) {
    admin.password = await Hash.make(password);
    return await this.adminRepository.save(admin);
  }

  /**
   * Update user email status
   *
   * @returns
   * @param admin
   */
  async updateEmailStatus(admin: Admin): Promise<Admin> {
    admin.emailConfirmed = true;
    return await this.adminRepository.save(admin);
  }

  /**
   *
   * @returns
   * @param admin
   */
  async toggle2FA(admin: Admin) {
    admin.twoFa = !admin.twoFa;
    await this.adminRepository.save(admin);
    return admin.twoFa ? 'Enabled' : 'Disabled';
  }

  async saveUserLog(userLog: AdminLogDTO) {
    const newUserLog = new AdminLoginHistory().fromDto(userLog);
    return await this.logsRepository.save(newUserLog);
  }

  /** ******************************************************************************************************************/
  /*
  /*                                    Admin Management
  /*
  /********************************************************************************************************************/

  /**
   * Get All Admins
   *
   * @params query
   * @params paginationOption
   * @returns admins
   */
  public async getAllAdmins(
    query: AdminListDTO,
    paginationOption: IPaginationOptions,
  ) {
    let filter = '';
    if (query?.email?.length) filter = `WHERE email LIKE '%${query.email}%' `;
    const sql = `SELECT
                A.uuid,
                A.created_at,
                A.email,
                A.status,
                activity_log AS last_login
                FROM 
                  admins A
                LEFT JOIN (
                  SELECT DISTINCT ON ("userId") activity_log, "userId"
                  FROM admin_login_history
                  ORDER BY "userId", activity_log DESC
                ) admin_login_history ON admin_login_history."userId" = A.uuid
                  ${filter}
                  ORDER BY A."created_at" DESC
                  LIMIT $1 OFFSET $2`;
    const admins = await this.adminRepository.query(sql, [
      paginationOption.limit,
      Number(paginationOption.limit) * (Number(paginationOption.page) - 1),
    ]);
    const count_sql = `SELECT
            CAST(COUNT(*) AS INTEGER) AS total_count
        FROM 
           admins A
          ${filter}`;
    const meta = await this.adminRepository.query(count_sql);
    return { admins, meta: meta[0] };
  }

  /**
   * Admin Detail Api
   *
   * @param id
   * @returns admin
   */
  public async adminDetail(id: string): Promise<Admin> {
    if (id && !isUUID(id)) {
      throw new HttpException(
        ResponseMessage.ADMIN_ID_IS_INVALID,
        ResponseCode.BAD_REQUEST,
      );
    }
    const admin = await this.adminRepository.findOne(id);
    if (!admin) {
      throw new HttpException(
        'Admin' + ResponseMessage.DOES_NOT_EXIST,
        ResponseCode.NOT_FOUND,
      );
    }
    return admin;
  }

  /**
   * Admin History Api
   *
   * @param id
   * @returns history
   */
  public async adminHistory(id: string, paginationOption: IPaginationOptions) {
    if (id && !isUUID(id)) {
      throw new HttpException(
        ResponseMessage.ADMIN_ID_IS_INVALID,
        ResponseCode.BAD_REQUEST,
      );
    }
    const history = await this.historyPaginate(paginationOption, {
      userId: id,
    });
    return {
      history,
    };
  }

  /**
   * Paginate Admin
   *
   * @param options
   * @param condition
   * @param relations
   * @returns
   */
  private async adminPaginate(
    options: IPaginationOptions,
    condition?: Object,
    relations?: string[],
  ): Promise<Pagination<Admin>> {
    return paginate<Admin>(this.adminRepository, options, {
      order: { created_at: 'DESC' },
      where: condition,
      relations,
    });
  }

  /**
   * Paginate Admin History
   *
   * @param options
   * @param condition
   * @param relations
   * @returns
   */
  private async historyPaginate(
    options: IPaginationOptions,
    condition?: Object,
    relations?: string[],
  ): Promise<Pagination<AdminLoginHistory>> {
    return paginate<AdminLoginHistory>(this.logsRepository, options, {
      order: { activity_log: 'DESC' },
      where: condition,
      relations,
    });
  }
}
